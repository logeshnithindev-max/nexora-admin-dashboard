"use client";

import { schemaTypes } from "../../lib/schema";
import { NestedFields } from "./NestedFields";

export function PropertyStructure({ property, onChange }) {
  const structured =
    property.data_type === "json" ||
    (property.data_type === "list" &&
      ["json", "list"].includes(property.inner_data_type));
  return (
    <div className="sub-property-block">
      {property.data_type === "list" && (
        <label className="list-item-type">
          <span>List item type</span>
          <select
            value={property.inner_data_type || "string"}
            onChange={(e) => {
              const inner_data_type = e.target.value;
              onChange({
                ...property,
                inner_data_type,
                is_loop: true,
                rule: { ...property.rule, inner_data_type, is_loop: true },
                sub_properties: ["json", "list"].includes(inner_data_type)
                  ? property.sub_properties || []
                  : [],
              });
            }}
          >
            {schemaTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
      )}
      {structured && (
        <>
          <b>
            {property.data_type === "json"
              ? "Nested JSON fields"
              : `${property.inner_data_type} item fields`}
          </b>
          <NestedFields
            fields={property.sub_properties || []}
            onChange={(sub_properties) =>
              onChange({ ...property, sub_properties })
            }
          />
        </>
      )}
    </div>
  );
}
