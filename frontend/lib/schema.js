export const schemaTypes = [
  "string",
  "boolean",
  "json",
  "list",
  "mixin",
  "date",
  "number",
  "date_time",
  "time",
];
export const newNested = () => ({
  name: "",
  data_type: "string",
  raw_json_path: "",
  is_required: false,
  is_loop: false,
  inner_data_type: null,
  children: [],
});

export const blankProperty = {
  name: "",
  label: "",
  nature: "defined",
  data_type: "string",
  data_type_fallback: null,
  description: "",
  sub_properties: [],
  is_required: false,
  is_conversion_event_property: false,
  is_live_activity: false,
  inner_data_type: null,
  rule: {
    raw_json_path: "",
    data_type: "string",
    is_loop: false,
    parent_id: 0,
    inner_data_type: null,
  },
};
export const blankEvent = {
  name: "",
  label: "",
  type: "custom",
  status: "active",
  nature: "defined",
  is_conversion_event: false,
  is_live_activity: false,
  properties: [],
};
