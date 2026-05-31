import subprocess
import json
import os
import pathlib
import platform
import re
import shlex
import time
from contextvars import ContextVar
from typing import Any

CORAL_BIN = os.getenv("CORAL_BIN", "coral")
DEFAULT_QUERY_TIMEOUT = int(os.getenv("COMPASS_CORAL_QUERY_TIMEOUT_SECONDS", "12"))
MAX_QUERIES_PER_RUN = int(os.getenv("COMPASS_MAX_CORAL_QUERIES_PER_RUN", "20"))
RECENT_PROOFS: list[dict] = []
REQUEST_PROOFS: ContextVar[list[dict] | None] = ContextVar("REQUEST_PROOFS", default=None)

COMPASS_SOURCE_CONTRACT: dict[str, dict[str, Any]] = {
    "google_calendar": {
        "tables": {},
        "functions": {
            "events_between": {"required": True, "arguments": ["calendar_id", "time_min", "time_max"], "result_columns": []},
            "primary_busy_windows": {"required": False, "arguments": ["time_min", "time_max"], "result_columns": []},
        },
    },
    "gmail": {
        "tables": {},
        "functions": {
            "search_messages": {"required": True, "arguments": ["q"], "result_columns": []},
        },
    },
    "github": {
        "tables": {
            "pulls": {
                "columns": ["number", "title", "state", "created_at", "merged_at", "draft"],
                "filters": ["owner", "repo", "state"],
            },
        },
        "functions": {
            "search_issues": {"required": True, "arguments": ["q"], "result_columns": ["title", "state", "number", "user_login"]},
        },
    },
    "notion": {
        "tables": {
            "data_source_pages": {
                "columns": ["id", "properties", "in_trash", "data_source_id"],
                "filters": ["data_source_id"],
            },
        },
        "functions": {},
    },
    "linear": {
        "tables": {
            "issues": {
                "columns": ["id", "identifier", "title", "priority", "state_type", "assignee_name", "created_at", "updated_at"],
                "filters": [],
            },
        },
        "functions": {
            "issue_comments": {"required": False, "arguments": ["issue"], "result_columns": []},
        },
    },
    "slack": {
        "tables": {},
        "functions": {
            "messages": {"required": True, "arguments": ["channel", "oldest", "latest"], "result_columns": ["user_id", "text", "ts"]},
            "thread_replies": {"required": False, "arguments": ["channel", "thread_ts", "oldest", "latest"], "result_columns": []},
        },
    },
    "todoist": {
        "tables": {
            "filtered_tasks": {
                "columns": ["id", "content", "priority", "due__date", "url", "query"],
                "filters": ["query"],
            },
            "tasks": {
                "columns": ["id", "content", "priority", "due__date", "url", "checked", "is_deleted"],
                "filters": [],
            },
        },
        "functions": {},
    },
    "discord": {
        "tables": {},
        "functions": {
            "recent_messages": {"required": True, "arguments": ["channel_id"], "result_columns": []},
        },
    },
}

_RESOLVED_CONFIG_DIR: pathlib.Path | None = None
_CONFIG_DIR_CHECKED: bool = False


def _coral_config_dir() -> pathlib.Path | None:
    """Resolve Coral's config directory for trace file access."""
    global _RESOLVED_CONFIG_DIR, _CONFIG_DIR_CHECKED
    if _CONFIG_DIR_CHECKED:
        return _RESOLVED_CONFIG_DIR
    _CONFIG_DIR_CHECKED = True
    override = os.getenv("CORAL_CONFIG_DIR")
    if override:
        _RESOLVED_CONFIG_DIR = pathlib.Path(override)
        return _RESOLVED_CONFIG_DIR
    home = pathlib.Path.home()
    system = platform.system()
    if system == "Windows":
        appdata = os.getenv("APPDATA")
        if appdata:
            _RESOLVED_CONFIG_DIR = pathlib.Path(appdata) / "withcoral" / "coral"
    elif system == "Darwin":
        _RESOLVED_CONFIG_DIR = home / "Library" / "Application Support" / "com.withcoral.coral"
    else:
        xdg = os.getenv("XDG_CONFIG_HOME")
        _RESOLVED_CONFIG_DIR = pathlib.Path(xdg) / "coral" if xdg else home / ".config" / "coral"
    return _RESOLVED_CONFIG_DIR


def _read_trace_spans(limit: int = 600) -> list[dict]:
    """Read the last `limit` spans from Coral's local trace JSONL store."""
    config_dir = _coral_config_dir()
    if not config_dir:
        return []
    spans_file = config_dir / "telemetry" / "traces" / "spans.jsonl"
    if not spans_file.exists():
        return []
    try:
        with spans_file.open("r", encoding="utf-8", errors="replace") as fh:
            lines = fh.readlines()
        result = []
        for line in lines[-limit:]:
            line = line.strip()
            if line:
                try:
                    result.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
        return result
    except OSError:
        return []


def _check_trace_history_enabled() -> None:
    """Warn once at startup if Coral's local trace history is not enabled."""
    config_dir = _coral_config_dir()
    if not config_dir:
        return
    spans_file = config_dir / "telemetry" / "traces" / "spans.jsonl"
    if spans_file.exists():
        return
    config_file = config_dir / "config.toml"
    if not config_file.exists():
        print(
            "[compass] Coral trace history not yet active. "
            "To enable span data in proof panels, add to "
            f"{config_file}:\n"
            "  version = 1\n  [trace_history]\n  enabled = true"
        )
        return
    try:
        content = config_file.read_text(encoding="utf-8", errors="replace")
        if "enabled = true" not in content:
            print(
                "[compass] Coral trace history is disabled. "
                "Add `[trace_history]\\nenabled = true` to "
                f"{config_file} to enable span counts in proof panels."
            )
    except OSError:
        pass


_check_trace_history_enabled()


def _find_trace_for_sql(sql: str, spans: list[dict]) -> dict | None:
    """Locate the most-recent trace whose coral.query span matches this SQL."""
    sql_norm = " ".join(sql.split()).lower()
    if not sql_norm:
        return None

    by_trace: dict[str, list[dict]] = {}
    matching_ids: list[str] = []

    for span in spans:
        tid = span.get("trace_id", "")
        if not tid:
            continue
        by_trace.setdefault(tid, []).append(span)
        if span.get("name") == "coral.query":
            attrs_raw = span.get("attributes_json", "{}")
            try:
                attrs = json.loads(attrs_raw) if isinstance(attrs_raw, str) else {}
            except Exception:
                attrs = {}
            span_sql = str(attrs.get("sql", ""))
            span_sql_norm = " ".join(span_sql.split()).lower()
            if span_sql_norm and (
                sql_norm == span_sql_norm
                or sql_norm[:120] == span_sql_norm[:120]
            ):
                matching_ids.append(tid)

    if not matching_ids:
        return None

    # Most-recent matching trace is the last match in file order
    best_id = matching_ids[-1]
    tspans = by_trace.get(best_id, [])
    start_times = [s["start_time_unix_nanos"] for s in tspans if s.get("start_time_unix_nanos")]
    end_times = [s["end_time_unix_nanos"] for s in tspans if s.get("end_time_unix_nanos")]
    duration_nanos = (max(end_times) - min(start_times)) if start_times and end_times else 0

    span_names: dict[str, int] = {}
    for span in tspans:
        name = span.get("name", "unknown")
        span_names[name] = span_names.get(name, 0) + 1

    return {
        "trace_id": best_id,
        "span_count": len(tspans),
        "trace_duration_ms": round(duration_nanos / 1_000_000),
        "spans_summary": [{"name": k, "count": v} for k, v in sorted(span_names.items())],
    }


def _coral_command(args: list[str]) -> list[str]:
    return [*shlex.split(CORAL_BIN), *args]


def _clean_error(text: str) -> str:
    lines = [
        line for line in str(text).splitlines()
        if not line.startswith("wsl: Failed to translate ")
    ]
    return "\n".join(lines).strip()


def _error_type(error: Exception | str) -> str:
    text = str(error).lower()
    if isinstance(error, FileNotFoundError) or "not found" in text and "coral" in text:
        return "coral_cli_missing"
    if isinstance(error, subprocess.TimeoutExpired) or "timed out" in text:
        return "timeout"
    if "schema contract" in text or "schema mismatch" in text:
        return "schema_contract_failed"
    if "sql" in text or "datafusion" in text or "table" in text or "column" in text or "coral" in text:
        return "coral_sql_error"
    return "unknown"


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y"}
    return bool(value)


def _json_array(value: Any) -> list[dict]:
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if not isinstance(value, str) or not value.strip():
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    return [item for item in parsed if isinstance(item, dict)] if isinstance(parsed, list) else []


def _catalog_name(item: dict[str, Any]) -> str:
    return str(item.get("name") or item.get("column_name") or item.get("argument_name") or item.get("field") or "")


def _extract_sources(sql: str) -> list[str]:
    names = set(re.findall(r"\b(?:FROM|JOIN)\s+([a-zA-Z_][\w]*)\.", sql, flags=re.IGNORECASE))
    return sorted(name for name in names if name != "coral")


def _parse_rows(stdout: str) -> list[dict]:
    text = stdout.strip()
    if not text:
        return []

    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict) and isinstance(parsed.get("rows"), list):
            return parsed["rows"]
        if isinstance(parsed, dict):
            return [parsed]
    except json.JSONDecodeError:
        pass

    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end > start:
        for idx in (i for i, char in enumerate(text[: end + 1]) if char == "["):
            try:
                parsed = json.loads(text[idx : end + 1])
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                continue

    rows: list[dict] = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line[0] not in "[{":
            continue
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, list):
            rows.extend(row for row in parsed if isinstance(row, dict))
        elif isinstance(parsed, dict) and isinstance(parsed.get("rows"), list):
            rows.extend(row for row in parsed["rows"] if isinstance(row, dict))
        elif isinstance(parsed, dict):
            rows.append(parsed)
    return rows


def coral_query(name: str, query: str, sources: list[str] | None = None, timeout: int | None = None) -> dict:
    """Execute Coral SQL and return rows plus a proof object."""
    timeout = timeout or DEFAULT_QUERY_TIMEOUT
    started = time.perf_counter()
    proof_sources = sources or _extract_sources(query)
    proof = {
        "name": name,
        "sql": query,
        "sources": proof_sources,
        "cross_source": len(proof_sources) > 1,
        "row_count": 0,
        "duration_ms": 0,
        "status": "running",
        "error": None,
        "failed": False,
        "error_type": None,
        "mode": "Coral CLI",
        "columns": [],
        "sample_rows": [],
    }

    try:
        result = subprocess.run(
            _coral_command(["sql", "--format", "json", query]),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            proof["status"] = "error"
            proof["failed"] = True
            proof["error"] = _clean_error(result.stderr.strip() or "Coral query failed")
            proof["error_type"] = _error_type(proof["error"])
            print(f"[coral] error: {result.stderr[:500]}")
            return {"rows": [], "proof": proof}
        text = result.stdout.strip()
        rows = _parse_rows(text) if text else []
        proof["status"] = "ok"
        proof["row_count"] = len(rows)
        proof["columns"] = list(rows[0].keys()) if rows else []
        proof["sample_rows"] = rows[:5]
        trace_spans = _read_trace_spans()
        trace = _find_trace_for_sql(query, trace_spans)
        if trace:
            proof.update(trace)
            proof["mode"] = "Coral CLI + Trace"
        return {"rows": rows, "proof": proof}
    except subprocess.TimeoutExpired:
        proof["status"] = "error"
        proof["failed"] = True
        proof["error"] = f"query timed out after {timeout}s"
        proof["error_type"] = "timeout"
        print(f"[coral] {proof['error']}")
        return {"rows": [], "proof": proof}
    except Exception as e:
        proof["status"] = "error"
        proof["failed"] = True
        proof["error"] = _clean_error(str(e))
        proof["error_type"] = _error_type(e)
        print(f"[coral] exception: {e}")
        return {"rows": [], "proof": proof}
    finally:
        proof["duration_ms"] = max(1, round((time.perf_counter() - started) * 1000))


def _active_proof_buffer() -> list[dict]:
    request_proofs = REQUEST_PROOFS.get()
    return request_proofs if request_proofs is not None else RECENT_PROOFS


def set_request_proof_buffer(proofs: list[dict]):
    return REQUEST_PROOFS.set(proofs)


def reset_request_proof_buffer(token) -> None:
    REQUEST_PROOFS.reset(token)


def record_coral_proof(proof: dict) -> None:
    """Attach a manually executed Coral proof to the active request buffer."""
    _active_proof_buffer().append(proof)


def coral_sql(query: str, timeout: int | None = None) -> list[dict]:
    proofs = _active_proof_buffer()
    if len(proofs) >= MAX_QUERIES_PER_RUN:
        proof_sources = _extract_sources(query)
        proofs.append({
            "name": "Coral SQL query",
            "sql": query,
            "sources": proof_sources,
            "cross_source": len(proof_sources) > 1,
            "row_count": 0,
            "duration_ms": 0,
            "status": "error",
            "error": f"query budget exceeded after {MAX_QUERIES_PER_RUN} Coral queries",
            "failed": True,
            "error_type": "query_budget_exceeded",
            "mode": "Compass circuit breaker",
            "columns": [],
            "sample_rows": [],
        })
        return []
    result = coral_query("Coral SQL query", query, timeout=timeout)
    proofs.append(result["proof"])
    return result["rows"]


def consume_recent_proofs(labels: list[str] | None = None) -> list[dict]:
    request_proofs = REQUEST_PROOFS.get()
    if labels is None:
        if request_proofs is not None:
            request_proofs.clear()
        else:
            RECENT_PROOFS.clear()
        REQUEST_PROOFS.set([])
        return []

    source = request_proofs if request_proofs is not None else RECENT_PROOFS
    proofs = source[:]
    source.clear()
    if request_proofs is not None:
        REQUEST_PROOFS.set(None)
    if labels:
        for proof, label in zip(proofs, labels):
            proof["name"] = label
    return proofs


def _run_coral(args: list[str], timeout: int = 30) -> subprocess.CompletedProcess:
    return subprocess.run(_coral_command(args), capture_output=True, text=True, timeout=timeout)


def _catalog_query(sql: str, label: str, validation_queries: list[dict], errors: list[dict]) -> list[dict]:
    entry = {"label": label, "sql": sql, "status": "running", "row_count": 0, "error": None}
    validation_queries.append(entry)
    try:
        result = _run_coral(["sql", "--format", "json", sql], timeout=30)
        if result.returncode != 0:
            message = _clean_error(result.stderr.strip() or f"{label} failed")
            entry.update({"status": "error", "error": message})
            errors.append({"label": label, "error": message, "error_type": _error_type(message)})
            return []
        rows = _parse_rows(result.stdout)
        entry.update({"status": "ok", "row_count": len(rows)})
        return rows
    except Exception as exc:
        message = _clean_error(str(exc))
        entry.update({"status": "error", "error": message})
        errors.append({"label": label, "error": message, "error_type": _error_type(exc)})
        return []


def source_readiness(required_sources: list[str]) -> dict:
    """Validate Compass' personal-agent Coral contract against live catalog metadata."""
    validation_queries: list[dict] = []
    errors: list[dict] = []

    table_rows = _catalog_query(
        "SELECT schema_name, table_name FROM coral.tables ORDER BY 1, 2",
        "coral.tables",
        validation_queries,
        errors,
    )
    column_rows = _catalog_query(
        "SELECT schema_name, table_name, column_name, data_type, is_required_filter FROM coral.columns ORDER BY 1, 2, ordinal_position",
        "coral.columns",
        validation_queries,
        errors,
    )
    filter_rows = _catalog_query(
        "SELECT schema_name, table_name, filter_name, filter_mode, is_required, data_type FROM coral.filters ORDER BY 1, 2, 3",
        "coral.filters",
        validation_queries,
        errors,
    )
    input_rows = _catalog_query(
        "SELECT schema_name, key, kind, required, is_set FROM coral.inputs ORDER BY 1, 2",
        "coral.inputs",
        validation_queries,
        errors,
    )
    function_rows = _catalog_query(
        "SELECT schema_name, function_name, kind, arguments_json, result_columns_json FROM coral.table_functions ORDER BY 1, 2",
        "coral.table_functions",
        validation_queries,
        errors,
    )

    tables_by_source: dict[str, dict[str, dict]] = {}
    for row in table_rows:
        schema = str(row.get("schema_name", ""))
        table = str(row.get("table_name", ""))
        if schema and table:
            tables_by_source.setdefault(schema, {})[table] = row

    columns_by_table: dict[tuple[str, str], dict[str, dict]] = {}
    for row in column_rows:
        schema = str(row.get("schema_name", ""))
        table = str(row.get("table_name", ""))
        column = str(row.get("column_name", ""))
        if schema and table and column:
            columns_by_table.setdefault((schema, table), {})[column] = row

    filters_by_table: dict[tuple[str, str], dict[str, dict]] = {}
    for row in filter_rows:
        schema = str(row.get("schema_name", ""))
        table = str(row.get("table_name", ""))
        filter_name = str(row.get("filter_name", ""))
        if schema and table and filter_name:
            filters_by_table.setdefault((schema, table), {})[filter_name] = row

    inputs_by_source: dict[str, list[dict]] = {}
    for row in input_rows:
        schema = str(row.get("schema_name", ""))
        if schema:
            inputs_by_source.setdefault(schema, []).append(row)

    functions_by_source: dict[str, dict[str, dict]] = {}
    for row in function_rows:
        schema = str(row.get("schema_name", ""))
        function_name = str(row.get("function_name", ""))
        if schema and function_name:
            function = dict(row)
            function["arguments"] = _json_array(row.get("arguments_json"))
            function["result_columns"] = _json_array(row.get("result_columns_json"))
            functions_by_source.setdefault(schema, {})[function_name] = function

    sources = []
    for source in required_sources:
        contract = COMPASS_SOURCE_CONTRACT.get(source, {"tables": {}, "functions": {}})
        source_tables = tables_by_source.get(source, {})
        source_functions = functions_by_source.get(source, {})
        source_inputs = inputs_by_source.get(source, [])
        missing = {
            "tables": [],
            "columns": [],
            "filters": [],
            "functions": [],
            "function_arguments": [],
            "function_result_columns": [],
            "credentials": [],
        }

        for table_name, table_contract in contract.get("tables", {}).items():
            if table_name not in source_tables:
                missing["tables"].append(table_name)
                continue
            available_columns = columns_by_table.get((source, table_name), {})
            for column_name in table_contract.get("columns", []):
                if column_name not in available_columns:
                    missing["columns"].append(f"{table_name}.{column_name}")
            available_filters = filters_by_table.get((source, table_name), {})
            for filter_name in table_contract.get("filters", []):
                if filter_name not in available_filters:
                    missing["filters"].append(f"{table_name}.{filter_name}")

        for function_name, function_contract in contract.get("functions", {}).items():
            function = source_functions.get(function_name)
            if not function:
                if function_contract.get("required", True):
                    missing["functions"].append(function_name)
                continue
            available_args = {_catalog_name(arg) for arg in function.get("arguments", [])}
            for arg_name in function_contract.get("arguments", []):
                if arg_name not in available_args and function_contract.get("required", True):
                    missing["function_arguments"].append(f"{function_name}.{arg_name}")
            available_result_columns = {_catalog_name(col) for col in function.get("result_columns", [])}
            for column_name in function_contract.get("result_columns", []):
                if column_name not in available_result_columns and function_contract.get("required", True):
                    missing["function_result_columns"].append(f"{function_name}.{column_name}")

        for row in source_inputs:
            if _truthy(row.get("required")) and not _truthy(row.get("is_set")):
                missing["credentials"].append(row.get("key"))

        installed = source in tables_by_source or source in functions_by_source
        missing_count = sum(len(values) for values in missing.values())
        readiness = "ready" if installed and missing_count == 0 else "blocked" if not installed else "degraded"
        sources.append({
            "name": source,
            "installed": installed,
            "readiness": readiness,
            "ready": readiness == "ready",
            "status": "ok" if readiness == "ready" else "warning",
            "table_count": len(source_tables),
            "function_count": len(source_functions),
            "column_count": sum(len(columns_by_table.get((source, table), {})) for table in source_tables),
            "tables": sorted(source_tables),
            "functions": [
                {
                    "name": name,
                    "kind": row.get("kind"),
                    "arguments": row.get("arguments", []),
                    "result_columns": row.get("result_columns", []),
                }
                for name, row in sorted(source_functions.items())
            ],
            "inputs": source_inputs,
            "credentials": {
                "inputs": source_inputs,
                "missing": missing["credentials"],
                "ready": not missing["credentials"],
            },
            "columns": {
                table: sorted(columns_by_table.get((source, table), {}))
                for table in sorted(source_tables)
            },
            "filters": [
                {"table": table, "filter": filter_name, **filter_row}
                for (schema, table), table_filters in filters_by_table.items()
                if schema == source
                for filter_name, filter_row in table_filters.items()
            ],
            "missing": missing,
            "missing_inputs": missing["credentials"],
            "last_test": {"status": "metadata", "error": None},
        })

    ready = not errors and all(source.get("ready") for source in sources)
    return {
        "ready": ready,
        "status": "ok" if ready else "warning",
        "sources": sources,
        "validation_queries": validation_queries,
        "errors": errors,
        "contract": COMPASS_SOURCE_CONTRACT,
    }


def source_health(required_sources: list[str]) -> dict:
    return source_readiness(required_sources)
