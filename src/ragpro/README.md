# Formal Source Layout

`src/ragpro/` is the target production-oriented source tree.

We are keeping the existing stage-based code under `packages/` intact for now:

- `a_tools_intro`
- `b_traditional_qa`
- `c_modular_rag`
- `d_multi_layer_rag`

New feature work should gradually move into `src/ragpro/`, while existing stage
code is used as the migration source.
