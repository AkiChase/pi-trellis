# Code Reuse Checklist

Before adding a helper, constant or state field:

1. Search the actual package owner/callers/tests, not generated or installed copies.
2. Compare semantics: source/target roots, material/runtime paths, cosmetic degradation/safety rejection and immutable identity/mutable preparation state are not interchangeable.
3. Extend an existing owner only when callers need the same invariant; preserve deliberate asymmetry. Do not duplicate native management/readiness or prompt-marker policy in another layer.
4. Avoid speculative frameworks or extraction based only on repeated syntax. State how focused negative tests prove unchanged behavior for every consumer.
5. Search all callers/references again and inspect real diffs after the change.

Authoritative ownership and constraints: [development guidelines](../development/index.md). Verification: [testing guidelines](../testing/index.md).
