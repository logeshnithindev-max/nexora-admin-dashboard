import json

from app.repositories.plan_metrics_repository import (
    get_basic_metrics,
    get_channels,
    get_channel_metrics,
)


def _parse_config(config_json):
    if config_json is None:
        return {}

    if isinstance(config_json, dict):
        return config_json

    if isinstance(config_json, str):
        try:
            return json.loads(config_json)
        except json.JSONDecodeError:
            return {}

    return {}


def _build_basic_metric(metric):
    return {
        "id": metric["id"],
        "metric_name": metric["metric_name"],
        "metric_key": metric["metric_key"],
        "config": _parse_config(metric["config_json"]),
        "is_active": bool(metric["is_active"]),
    }


def _build_channel_metric(metric):
    return {
        "id": metric["id"],
        "metric_name": metric["metric_name"],
        "metric_key": metric["metric_key"],
        "config": _parse_config(metric["config_json"]),
        "is_active": bool(metric["is_active"]),
    }


def get_plan_metrics(db):
    basic_metric_rows = get_basic_metrics(db)
    channel_rows = get_channels(db)
    channel_metric_rows = get_channel_metrics(db)

    basic_metrics = [
        _build_basic_metric(metric)
        for metric in basic_metric_rows
    ]

    channel_metrics_by_id = {}

    for channel in channel_rows:
        channel_metrics_by_id[channel["id"]] = {
            "channel": {
                "id": channel["id"],
                "name": channel["name"],
                "code": channel["code"],
            },
            "metrics": [],
        }

    for metric in channel_metric_rows:
        channel_id = metric["channel_id"]

        if channel_id not in channel_metrics_by_id:
            continue

        channel_metrics_by_id[channel_id]["metrics"].append(
            _build_channel_metric(metric)
        )

    return {
        "basic_metrics": basic_metrics,
        "channel_metrics": list(channel_metrics_by_id.values()),
    }