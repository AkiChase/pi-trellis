# Cross-Layer Checklist

For each changed boundary, trace input origin/shape, validator, authoritative state, side effects, error output and tests.

- Distinguish project root, target root, Pi session, context key, task path and binding ID; verify exact provenance rather than names alone.
- Separate package source, deployed resources, task material and mutable configuration. Preserve lexical/realpath limits and explicit external-store exceptions.
- Check preview vs confirm and revalidation under lock/before write; validation once cannot protect mutable files, pointers, branches or occupancy.
- Preserve outputs and error/unknown state after partial publication or ambiguous spawn. Stop acknowledgement, terminal evidence, check freshness and acceptance are different facts.
- Trace ordinary Agent vs managed RPC, parent vs child, new vs reused bindings, safe update vs adoption and bundled vs customized roles.
- Verify rejected inputs preserve pointers/code/index/customizations; mocks do not establish actual provider/terminal behavior or an OS sandbox.

Use [development guidelines](../development/index.md) for concrete contracts and [testing guidelines](../testing/index.md) for evidence boundaries. Do not turn this compatibility checklist into another implementation manual.
