# Real Terminal Testing with tmux

Adapted from the neighboring my-pi-preset terminal guide for pi-trellis CLI/TUI smoke testing. This is a reusable method, not a test report. Component tests, real terminal interaction and online model quality are separate evidence layers; offline terminal success does not cover arbitrary themes, IME, plugin combinations or providers.

## 1. Authorization and Isolation

Before running, describe actions, matrix and cleanup scope and obtain explicit real-terminal test authorization. Use existing CLI/tmux installations only; do not connect to personal panes, download dependencies or treat documentation work as run authorization.

- Use a unique `tmux -L <test-id>` server. Every management command includes the same `-L`; never use an unqualified `kill-server`.
- Create your own temporary HOME, `PI_CODING_AGENT_DIR`, cwd, session, config and log directories. Do not inherit personal authentication or package registration.
- Prefer `env -i` with explicit required PATH, TERM and isolated variables. Disable automatic resource discovery; load the checked-out target extension explicitly with `-e`. Verify flags against the installed CLI help first.
- Use a scripted local provider or a minimal no-model flow; never access online APIs without separate approval. Label providers as fixtures, not autonomous model-quality evidence.
- No install, full sync or reload of personal instances. Missing dependencies mean NOT_RUN, not installation of a second SDK.
- Choose a disposable project by feature. The viewer can read isolated task files without deployed runtime. Initialization writes only to a self-created project after native confirmation. Dispatch requires complete compatible runtime, roles and persistent adapter configuration: parent-only `-e` does not prove children load the adapter. See [dispatch usage](../../../docs/dispatch.md) and [initialization](../../../docs/initialization.md). Never bypass manifests/worktree validation for a test.

## 2. Start with a Minimal Matrix

First exercise one success, one error and the core expand/collapse or enter/back interaction, then add specialized cases. Do not start by building a complete agent/workflow harness.

| Dimension | Examples |
| --- | --- |
| Mode | regular, fullscreen |
| Width | 140, 80, 40 columns; dynamic resize separately |
| Theme | explicitly fixed dark/light/system; do not substitute one for another |
| Text | CJK, combining characters, long paths/titles, controls, empty/error states |
| Input | actual keys, Esc cancellation, back, focus restoration, relevant dialogs |
| Lifecycle | new session, close, normal quit and actual process cleanup |

Fixed-width launch is not dynamic resize. Keyboard success does not prove physical mouse/IME. Viewer smoke may start with list entry, Enter, Left/Right, Esc, `r` and restored editor focus; initialization with cancel/no writes and one owned-project success. A simulated menu is not a real screen.

## 3. Driving, Waiting and Capture

Use `tmux send-keys` for actual keys (for example `C-o`), chosen from the feature's real registration. Save before/after evidence: successful key delivery alone does not prove the action occurred.

Wait using bounded condition loops or monitor for expected screens/events/raw frames. Never guess completion with fixed sleeps. Set an overall deadline and explicit failure exit so a test cannot hang indefinitely.

- `capture-pane -p` saves text; `capture-pane -p -e` retains SGR. Neither is an image screenshot.
- For rendering diagnosis, use `PI_TUI_WRITE_LOG` for owned raw ANSI output only after confirming installed CLI support. Keep bounded fragments/action markers and check for credentials.
- After resize, confirm a completed **new-width frame in raw CLI output** before judging appearance. tmux may clip an old frame; border length alone is misleading.
- Verify background continuity by displayed cells. A 48m sequence does not prove a full row; 0m/49m after ellipsized titles may cancel background early.
- Mouse SGR bytes injected through stdin are simulated input, not physical mouse end-to-end validation.
- `/debug` or event logs cannot replace actual overlay and focus evidence.

## 4. Results and Fixture Errors

Mark each case PASS, FAIL or NOT_RUN; report commands, installed CLI version, theme, mode, dimensions and exit code. A driver catching exceptions and exiting 0 is not success: inspect report.error, individual cases, screens and events.

Preserve product and fixture failures separately. Changed labels/order or old-frame clipping may be a fixture issue only after checking actual source/raw output. Do not alter product behavior or weaken expected behavior to fit a failing harness. After a scoped fixture repair, rerun the affected matrix and retain the first failure.

Online models, third-party original-package compatibility, physical IME and arbitrary plugin combinations are NOT_RUN unless tested. Stage completion is not acceptance. The [offline provider probe](index.md#optional-installed-hostprovider-probe) checks mechanisms, not terminal/model quality.

## 5. Cleanup and Evidence

In finally, request normal quit from the owned CLI and verify the CLI and owned children actually exit. If needed, TERM/KILL only verified test PIDs/process groups; stale PIDs do not authorize signals. Stop the unique test server and delete only self-created temporary configuration.

Report residual processes, timeouts and cleanup failures. Closing a panel or terminal status is not OS-level exit. Keep bounded evidence in the current task's `evidence/` directory; this guide does not accumulate historical PASS counts.

Before reusing a historical fixture, read its failure notes, launch flags and versions. Neighbor-project results are not pi-trellis acceptance evidence. General environment/reporting rules are in [testing guidelines](index.md).
