import { getMarkdownTheme, type Theme } from "@earendil-works/pi-coding-agent";
import { Markdown, Text, matchesKey, truncateToWidth, visibleWidth, wrapTextWithAnsi, type TUI } from "@earendil-works/pi-tui";
import { displayValue, readDocument, readTasks, safeText, taskLabel, type BrowserTask, type TaskDocument, type TaskSnapshot } from "./reader.ts";

const SECTIONS = ["Overview", "PRD", "Design", "Implement"] as const;
const DOCUMENT_SECTIONS = ["prd", "design", "implement"] as const;
function statusColor(status: string): "accent" | "warning" | "success" | "error" | "muted" {
	return status === "in_progress" ? "accent" : status === "planning" ? "warning" : status === "completed" ? "success" : status === "task_error" ? "error" : "muted";
}
function codeLiteral(text: string): string {
	let longest = 0;
	for (const match of text.matchAll(/`+/g)) longest = Math.max(longest, match[0].length);
	const delimiter = "`".repeat(longest + 1);
	return `${delimiter} ${text} ${delimiter}`;
}

/** Literalize only image tokens, not their surrounding table/list/heading or shared link definitions.
 * Definitions remain active for supported links; a literal appendix keeps referenced image URLs visible.
 */
export function readableMarkdown(text: string): string {
	if (!text.includes("![")) return text;
	let fence: { marker: string; length: number } | undefined;
	const definitions: string[] = [];
	let hasImages = false;
	let inList = false;
	const lines = text.split("\n").map(line => {
		const listItem = /^\s*(?:>\s*)*(?:[-+*]|\d+[.)])\s+/.test(line);
		if (listItem) inList = true;
		else if (line.trim() && /^\S/.test(line)) inList = false;
		const match = /^\s*(?:>\s*)*(?:(?:[-+*]|\d+[.)])\s+)?(`{3,}|~{3,})/.exec(line);
		if (match) {
			if (!fence) fence = { marker: match[1][0], length: match[1].length };
			else if (match[1][0] === fence.marker && match[1].length >= fence.length && !line.slice(match[0].length).trim()) fence = undefined;
			return line;
		}
		if (fence || (!inList && /^(?: {4}|\t)/.test(line))) return line;
		if (/^\s{0,3}\[[^\]]+\]:/.test(line)) { definitions.push(line); return line; }
		let result = "";
		for (let index = 0; index < line.length;) {
			if (line[index] === "\\") { result += line.slice(index, index + 2); index += 2; continue; }
			if (line[index] === "`") {
				const delimiter = /^`+/.exec(line.slice(index))![0];
				let end = index + delimiter.length;
				let closed = false;
				while (end < line.length) {
					if (line[end] !== "`") { end++; continue; }
					const run = /^`+/.exec(line.slice(end))![0];
					end += run.length;
					if (run.length === delimiter.length) { closed = true; break; }
				}
				if (!closed) {
					// Do not let this unmatched source run become the opener for an inserted image span.
					result += delimiter.replace(/`/g, "\\`"); index += delimiter.length; continue;
				}
				result += line.slice(index, end); index = end; continue;
			}
			if (line.slice(index, index + 2) !== "![") { result += line[index++]; continue; }
			const closing = (start: number, open: string, close: string): number => {
				let depth = 0;
				for (let end = start; end < line.length; end++) {
					if (line[end] === "\\") { end++; continue; }
					if (line[end] === open) depth++;
					else if (line[end] === close && --depth === 0) return end + 1;
				}
				return -1;
			};
			let end = closing(index + 1, "[", "]");
			if (end < 0) { result += line[index++]; continue; }
			if (line[end] === "(" || line[end] === "[") {
				const destination = closing(end, line[end], line[end] === "(" ? ")" : "]");
				if (destination > 0) end = destination;
			}
			// GFM tables require pipes escaped even inside code spans.
			result += codeLiteral(line.slice(index, end)).replace(/(?<!\\)\|/g, "\\|");
			hasImages = true; index = end;
		}
		return result;
	});
	if (hasImages && definitions.length) return lines.concat("", definitions.map(codeLiteral)).join("\n");
	return lines.join("\n");
}

export class TaskBrowser {
	private snapshot: TaskSnapshot;
	private mode: "list" | "detail" = "list";
	private selected = 0;
	private listOffset = 0;
	private detailTask?: BrowserTask;
	private section = 0;
	private offsets = [0, 0, 0, 0];
	private documents = new Map<number, TaskDocument>();
	private cachedBody?: { key: string; lines: string[] };
	private bodyHeight = 1;
	private current?: string;
	private closed = false;

	private root: string;
	private tui: Pick<TUI, "terminal" | "requestRender">;
	private themeSource: Theme | (() => Theme);
	private done: () => void;
	private readCurrent: () => string | undefined;

	constructor(
		root: string,
		tui: Pick<TUI, "terminal" | "requestRender">,
		themeSource: Theme | (() => Theme),
		done: () => void,
		readCurrent: () => string | undefined,
	) {
		this.root = root; this.tui = tui; this.themeSource = themeSource; this.done = done; this.readCurrent = readCurrent;
		this.snapshot = readTasks(root);
		this.refreshCurrent();
	}
	private get theme(): Theme { return typeof this.themeSource === "function" ? this.themeSource() : this.themeSource; }
	private refreshCurrent(): void {
		try { this.current = this.readCurrent(); } catch { this.current = undefined; }
	}
	invalidate(): void { this.cachedBody = undefined; }
	private refresh(): void {
		const identity = this.snapshot.rows[this.selected]?.task.identity;
		const next = readTasks(this.root);
		this.snapshot = next;
		const index = next.rows.findIndex(row => row.task.identity === identity);
		this.selected = index >= 0 ? index : Math.min(this.selected, Math.max(0, next.rows.length - 1));
		if (this.detailTask) this.detailTask = next.tasks.find(task => task.identity === this.detailTask!.identity) ?? this.detailTask;
		this.documents.clear(); this.refreshCurrent(); this.invalidate();
	}
	handleInput(data: string): void {
		if (this.closed) return;
		if (matchesKey(data, "ctrl+c") || (matchesKey(data, "escape") && this.mode === "list")) {
			this.closed = true; this.done(); return;
		}
		if (matchesKey(data, "escape")) this.mode = "list";
		else if (matchesKey(data, "r")) this.refresh();
		else if (this.mode === "list") {
			const total = this.snapshot.rows.length + this.snapshot.diagnostics.length;
			if (matchesKey(data, "up")) this.selected = Math.max(0, this.selected - 1);
			else if (matchesKey(data, "down")) this.selected = Math.min(Math.max(0, total - 1), this.selected + 1);
			else if (matchesKey(data, "pageUp")) this.selected = Math.max(0, this.selected - this.bodyHeight);
			else if (matchesKey(data, "pageDown")) this.selected = Math.min(Math.max(0, total - 1), this.selected + this.bodyHeight);
			else if (matchesKey(data, "enter") && this.snapshot.rows[this.selected]) {
				this.detailTask = this.snapshot.rows[this.selected].task;
				this.mode = "detail"; this.section = 0; this.offsets = [0, 0, 0, 0]; this.documents.clear(); this.invalidate();
			}
		} else {
			if (matchesKey(data, "left")) this.section = (this.section + SECTIONS.length - 1) % SECTIONS.length;
			else if (matchesKey(data, "right")) this.section = (this.section + 1) % SECTIONS.length;
			else if (matchesKey(data, "up")) this.offsets[this.section] = Math.max(0, this.offsets[this.section] - 1);
			else if (matchesKey(data, "down")) this.offsets[this.section]++;
			else if (matchesKey(data, "pageUp")) this.offsets[this.section] = Math.max(0, this.offsets[this.section] - this.bodyHeight);
			else if (matchesKey(data, "pageDown")) this.offsets[this.section] += this.bodyHeight;
		}
		this.tui.requestRender();
	}
	private isCurrent(task: BrowserTask): boolean { return task.identity === this.current; }
	private metadata(task: BrowserTask, width: number): string[] {
		return new Text([
			this.theme.bold(this.theme.fg("text", taskLabel(task))),
			this.theme.fg("muted", `Path: ${safeText(task.dir)}`),
			this.theme.fg(statusColor(task.status), `Status: ${safeText(task.status)}`),
			...(this.isCurrent(task) ? [this.theme.fg("accent", "Current task")] : []),
		].join("\n"), 0, 0).render(width);
	}
	private detailBody(width: number): string[] {
		const task = this.detailTask!;
		const key = `${task.identity}:${this.section}:${width}`;
		if (this.cachedBody?.key === key) return this.cachedBody.lines;
		let lines = this.metadata(task, width);
		if (!this.snapshot.tasks.some(item => item.identity === task.identity)) {
			lines = lines.concat(new Text("Task no longer available. Press Esc to return to the list.", 0, 0).render(width));
		} else if (this.section === 0) {
			const fields: string[] = [];
			for (const [field, label] of [["id", "ID"], ["description", "Description"], ["priority", "Priority"], ["assignee", "Assignee"], ["createdAt", "Created"], ["completedAt", "Completed"], ["branch", "Branch"], ["parent", "Parent"]]) {
				const value = task.record[field];
				if (typeof value === "string" && value) fields.push(`${label}: ${safeText(value, true)}`);
			}
			if (Array.isArray(task.record.children)) fields.push(`Children: ${task.record.children.map(value => safeText(displayValue(value))).join(", ") || "None"}`);
			lines = lines.concat("", new Text(this.theme.fg("text", fields.join("\n") || "No additional metadata"), 0, 0).render(width));
		} else {
			let document = this.documents.get(this.section);
			if (!document) { document = readDocument(this.root, task, DOCUMENT_SECTIONS[this.section - 1]); this.documents.set(this.section, document); }
			lines.push("");
			if (document.state === "ready") {
				try {
					lines = lines.concat(new Markdown(readableMarkdown(document.text), 0, 0, getMarkdownTheme()).render(width));
				} catch {
					// Host parser limits must not take down the TUI; keep the complete source scrollable.
					lines = lines.concat(new Text(this.theme.fg("warning", "Unable to render Markdown; showing document source."), 0, 0).render(width),
						new Text(document.text, 0, 0).render(width));
				}
			} else {
				const detail = "diagnostic" in document && document.diagnostic ? `: ${document.diagnostic}` : "";
				const message = document.state === "missing" ? "Document not created" : document.state === "empty" ? "Document is empty" : document.state === "removed" ? "Task no longer available" : `Unable to read document${detail}`;
				lines = lines.concat(new Text(this.theme.fg(document.state === "error" ? "error" : "muted", message), 0, 0).render(width));
			}
		}
		// Some host raw HTML/code tokens contain embedded newlines or overwide content.
		// Wrap rather than clip: all detail content remains reachable by scrolling.
		lines = lines.flatMap(line => line.split("\n").flatMap(part => wrapTextWithAnsi(part, width)));
		this.cachedBody = { key, lines };
		return lines;
	}
	private listLine(index: number, width: number): string {
		const row = this.snapshot.rows[index];
		let line: string;
		if (row) {
			// Protect the current marker/status before allocating the remaining title width.
			const marker = this.isCurrent(row.task) ? "* " : "  ";
			const status = safeText(row.task.status);
			const prefix = marker + `[${status}] `;
			line = this.theme.fg(this.isCurrent(row.task) ? "accent" : "dim", marker) +
				this.theme.fg(statusColor(row.task.status), `[${status}] `) +
				this.theme.fg("text", truncateToWidth(row.prefix + taskLabel(row.task), Math.max(0, width - visibleWidth(prefix)), "…"));
		} else line = this.theme.fg("error", `Warning: ${this.snapshot.diagnostics[index - this.snapshot.rows.length]}`);
		line = truncateToWidth(line, width, "…");
		return index === this.selected ? this.theme.bg("userMessageBg", line + " ".repeat(Math.max(0, width - visibleWidth(line)))) : line;
	}
	render(width: number): string[] {
		if (width < 1) return [];
		const rows = Math.max(1, Math.floor(this.tui.terminal.rows || 24));
		const header = [this.theme.bold(this.theme.fg("accent", "Trellis Tasks"))];
		if (this.mode === "list") header.push(this.theme.fg("muted", `${this.snapshot.tasks.length} tasks${this.snapshot.complete ? "" : " · Incomplete data"} · * Current task`));
		else if (width < 38) header.push(this.theme.fg("accent", `${SECTIONS[this.section]} (${this.section + 1}/${SECTIONS.length}) · ←/→`));
		else header.push(SECTIONS.map((label, index) => index === this.section ? this.theme.bold(this.theme.fg("accent", label)) : this.theme.fg("muted", label)).join(" | "));
		header.push(this.theme.fg("dim", "─".repeat(width)));
		const hints = width < 70
			? this.mode === "list" ? "Esc Close · r Refresh · ↑/↓ · Enter" : "Esc Back · r Refresh · ←/→ · ↑/↓ · PgUp/PgDn"
			: this.mode === "list" ? "↑/↓ Select · Enter Open · r Refresh · Esc Close" : "←/→ Section · ↑/↓ Scroll · PgUp/PgDn Page · r Refresh · Esc Back";
		// Keep both boundary lines visible even on small terminals; collapse secondary header rows first.
		while (header.length > Math.max(1, rows - 2)) header.splice(1, 1);
		const footerRows = rows > 1 ? 1 : 0;
		this.bodyHeight = Math.max(0, rows - header.length - footerRows);
		let body: string[];
		let position: string;
		if (this.mode === "list") {
			const total = this.snapshot.rows.length + this.snapshot.diagnostics.length;
			this.selected = Math.max(0, Math.min(this.selected, Math.max(0, total - 1)));
			this.listOffset = Math.max(0, Math.min(this.listOffset, Math.max(0, total - this.bodyHeight)));
			if (this.selected < this.listOffset) this.listOffset = this.selected;
			if (this.bodyHeight > 0 && this.selected >= this.listOffset + this.bodyHeight) this.listOffset = this.selected - this.bodyHeight + 1;
			body = total ? Array.from({ length: Math.min(this.bodyHeight, total - this.listOffset) }, (_, index) => this.listLine(this.listOffset + index, width)) : [this.theme.fg("muted", "No tasks found")].slice(0, this.bodyHeight);
			position = total ? `${this.selected + 1}/${total}` : "0/0";
		} else {
			const lines = this.detailBody(width);
			this.offsets[this.section] = Math.max(0, Math.min(this.offsets[this.section], Math.max(0, lines.length - this.bodyHeight)));
			const offset = this.offsets[this.section];
			body = lines.slice(offset, offset + this.bodyHeight);
			position = `${Math.min(lines.length, offset + 1)}–${Math.min(lines.length, offset + this.bodyHeight)}/${lines.length}`;
		}
		while (body.length < this.bodyHeight) body.push("");
		const footer = this.theme.fg("dim", width < 40 ? `${hints} · ${position}` : `${position} · ${hints}`);
		return [...header, ...body, ...(footerRows ? [footer] : [])].map(line => {
			const clipped = truncateToWidth(line, width, "…");
			return clipped + " ".repeat(Math.max(0, width - visibleWidth(clipped)));
		});
	}
}
