"""
3D coordinates for the frontend viewer, generated with RDKit at request time.

Deliberately embeds the SAME heavy-atom-only molecule that smiles_to_graph()
and atom_importance.py use (no explicit hydrogens added) — that keeps atom
index N referring to the identical atom in the geometry, the importance
weights, and the graph everywhere else in this pipeline. RDKit's SMILES
parser assigns atom indices in the order atoms appear in the SMILES string;
nothing downstream (graph conversion, gradient computation, 3D embedding)
reorders them, so index correspondence holds as long as every caller parses
the same SMILES string via Chem.MolFromSmiles independently, which they do.
"""

from rdkit import Chem
from rdkit.Chem import AllChem


# Cheap, best-effort functional-group tags for the atom tooltip. Plain
# substructure matching on an already-parsed small molecule — microseconds,
# no extra conformer/model work — so it's fine to run on every /predict call.
# Ordered most-specific first: an atom keeps the first tag that matches it.
_FUNCTIONAL_GROUP_SMARTS = [
    ("carboxylic acid", "[CX3](=O)[OX2H1]"),
    ("ester", "[CX3](=O)[OX2H0][#6]"),
    ("amide", "[CX3](=[OX1])[NX3]"),
    ("nitro", "[$([NX3](=O)=O)]"),
    ("carbonyl", "[CX3]=[OX1]"),
    ("hydroxyl", "[OX2H][#6]"),
    ("ether", "[OX2]([#6])[#6]"),
    ("amine", "[NX3;H2,H1,H0;!$(NC=O)]"),
    ("halide", "[F,Cl,Br,I]"),
]
_FUNCTIONAL_GROUP_PATTERNS = [(label, Chem.MolFromSmarts(smarts)) for label, smarts in _FUNCTIONAL_GROUP_SMARTS]


def _functional_groups(mol) -> dict:
    """Best-effort atom-index -> functional-group label. Not exhaustive —
    plain aliphatic carbons and similar get no tag, which is expected."""
    tags: dict = {}
    for label, pattern in _FUNCTIONAL_GROUP_PATTERNS:
        if pattern is None:
            continue
        for match in mol.GetSubstructMatches(pattern):
            for idx in match:
                tags.setdefault(idx, label)
    for atom in mol.GetAtoms():
        if atom.GetIdx() not in tags and atom.GetIsAromatic():
            tags[atom.GetIdx()] = "aromatic ring"
    return tags


def compute_structure(smiles: str) -> dict:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError(f"Invalid SMILES: {smiles}")

    mol = Chem.Mol(mol)  # work on a copy; embedding mutates conformers in place

    embedded = False
    for seed in (0xF00D, 1, 42, 7):
        try:
            if AllChem.EmbedMolecule(mol, randomSeed=seed, useRandomCoords=True) == 0:
                embedded = True
                break
        except Exception:
            continue

    if embedded:
        try:
            AllChem.MMFFOptimizeMolecule(mol)
        except Exception:
            try:
                AllChem.UFFOptimizeMolecule(mol)
            except Exception:
                pass  # keep the unoptimized embedded coordinates rather than failing

    if not embedded or mol.GetNumConformers() == 0:
        # Last resort so /predict never fails outright over a stubborn
        # embedding case: lay atoms out flat in a line. Geometrically
        # meaningless, but keeps indices valid and the viewer renderable.
        conf = Chem.Conformer(mol.GetNumAtoms())
        for i in range(mol.GetNumAtoms()):
            conf.SetAtomPosition(i, (float(i) * 1.5, 0.0, 0.0))
        mol.RemoveAllConformers()
        mol.AddConformer(conf)

    conformer = mol.GetConformer()
    functional_groups = _functional_groups(mol)
    atoms = []
    for atom in mol.GetAtoms():
        pos = conformer.GetAtomPosition(atom.GetIdx())
        atoms.append({
            "index": atom.GetIdx(),
            "symbol": atom.GetSymbol(),
            "x": round(pos.x, 4),
            "y": round(pos.y, 4),
            "z": round(pos.z, 4),
            "functional_group": functional_groups.get(atom.GetIdx()),
        })

    bonds = [
        {
            "begin": bond.GetBeginAtomIdx(),
            "end": bond.GetEndAtomIdx(),
            "order": bond.GetBondTypeAsDouble(),
        }
        for bond in mol.GetBonds()
    ]

    return {"atoms": atoms, "bonds": bonds}
