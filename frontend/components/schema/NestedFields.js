"use client";

import { schemaTypes, newNested } from "../../lib/schema";

export function NestedFields({ fields, onChange, depth = 0 }) {
  function update(index, key, value) {
    const next = fields.map((field, i) =>
      i === index ? { ...field, [key]: value } : field,
    );
    onChange(next);
  }
  return (
    <div className="nested-fields" style={{ "--depth": depth }}>
      {fields.map((field, index) => (
        <div className="nested-field" key={index}>
          <div className="nested-row">
            <input
              placeholder="Field name"
              value={field.name}
              onChange={(e) => update(index, "name", e.target.value)}
            />
            <select
              value={field.data_type}
              onChange={(e) => {
                const data_type = e.target.value;
                const next = {
                  ...field,
                  data_type,
                  is_loop: data_type === "list",
                  inner_data_type:
                    data_type === "list"
                      ? field.inner_data_type || "string"
                      : null,
                  children: ["list", "json"].includes(data_type)
                    ? field.children || []
                    : [],
                };
                onChange(fields.map((item, i) => (i === index ? next : item)));
              }}
            >
              {schemaTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            <input
              placeholder="Raw mapping path"
              value={field.raw_json_path}
              onChange={(e) => update(index, "raw_json_path", e.target.value)}
            />
            <button
              type="button"
              onClick={() => onChange(fields.filter((_, i) => i !== index))}
            >
              ⌫
            </button>
          </div>
          {field.data_type === "list" && (
            <div className="list-item-type">
              <span>List item type</span>
              <select
                value={field.inner_data_type || "string"}
                onChange={(e) =>
                  update(index, "inner_data_type", e.target.value)
                }
              >
                {schemaTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
          )}
          {(field.data_type === "json" ||
            (field.data_type === "list" &&
              ["json", "list"].includes(field.inner_data_type))) && (
            <div className="nested-children">
              <div className="nested-type">
                <span>
                  {field.data_type === "list"
                    ? `${field.inner_data_type} item fields`
                    : "JSON structure"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    update(index, "children", [
                      ...(field.children || []),
                      newNested(),
                    ])
                  }
                >
                  ＋ Add field
                </button>
              </div>
              <NestedFields
                fields={field.children || []}
                depth={depth + 1}
                onChange={(children) => update(index, "children", children)}
              />
            </div>
          )}
        </div>
      ))}
      <button
        className="add-nested"
        type="button"
        onClick={() => onChange([...fields, newNested()])}
      >
        ＋ Add field
      </button>
    </div>
  );
}
