import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface JsonSchema {
  type?: string | string[];
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  enum?: (string | number | boolean)[];
  default?: unknown;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  const?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
}

interface SchemaFormProps {
  schema: JsonSchema;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

export function SchemaForm({ schema, value, onChange }: SchemaFormProps) {
  return (
    <div className="space-y-4">
      {schema.properties && (
        <ObjectField
          schema={schema}
          value={value}
          onChange={onChange}
          path={[]}
          depth={0}
        />
      )}
    </div>
  );
}

interface FieldProps {
  schema: JsonSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  path: string[];
  depth: number;
  required?: boolean;
}

function ObjectField({ schema, value, onChange, path, depth }: FieldProps) {
  const objValue = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const properties = schema.properties ?? {};
  const requiredFields = schema.required ?? [];

  // Group properties by whether they're objects/arrays (complex) or primitives (simple)
  const entries = Object.entries(properties);
  const simpleFields = entries.filter(([_, propSchema]) => {
    const type = getSchemaType(propSchema);
    return type !== "object" && type !== "array";
  });
  const complexFields = entries.filter(([_, propSchema]) => {
    const type = getSchemaType(propSchema);
    return type === "object" || type === "array";
  });

  const handlePropertyChange = (propName: string, propValue: unknown) => {
    onChange({ ...objValue, [propName]: propValue });
  };

  return (
    <div className="space-y-4">
      {/* Simple fields in a grid */}
      {simpleFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {simpleFields.map(([propName, propSchema]) => (
            <FieldRenderer
              key={propName}
              name={propName}
              schema={propSchema}
              value={objValue[propName]}
              onChange={(v) => handlePropertyChange(propName, v)}
              path={[...path, propName]}
              depth={depth}
              required={requiredFields.includes(propName)}
            />
          ))}
        </div>
      )}

      {/* Complex fields (objects/arrays) as collapsible sections */}
      {complexFields.map(([propName, propSchema]) => (
        <CollapsibleSection
          key={propName}
          name={propName}
          schema={propSchema}
          value={objValue[propName]}
          onChange={(v) => handlePropertyChange(propName, v)}
          path={[...path, propName]}
          depth={depth}
          required={requiredFields.includes(propName)}
        />
      ))}
    </div>
  );
}

function CollapsibleSection({
  name,
  schema,
  value,
  onChange,
  path,
  depth,
  required,
}: FieldProps & { name: string }) {
  const [isOpen, setIsOpen] = useState(depth < 2); // Auto-expand first 2 levels
  const type = getSchemaType(schema);
  const title = schema.title || formatLabel(name);

  return (
    <Card className={cn("border-border", depth > 0 && "border-l-4 border-l-primary/30")}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center gap-2">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <CardTitle className="text-base font-medium">
                {title}
                {required && <span className="text-destructive ml-1">*</span>}
              </CardTitle>
              <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                {type === "array" ? "Array" : "Object"}
              </span>
            </div>
            {schema.description && (
              <p className="text-sm text-muted-foreground mt-1 ml-6">{schema.description}</p>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {type === "array" ? (
              <ArrayField
                schema={schema}
                value={value}
                onChange={onChange}
                path={path}
                depth={depth + 1}
              />
            ) : (
              <ObjectField
                schema={schema}
                value={value}
                onChange={onChange}
                path={path}
                depth={depth + 1}
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ArrayField({ schema, value, onChange, path, depth }: FieldProps) {
  const arrayValue = Array.isArray(value) ? value : [];
  const itemSchema = schema.items ?? { type: "string" };
  const itemType = getSchemaType(itemSchema);

  const handleAdd = () => {
    const defaultValue = getDefaultValue(itemSchema);
    onChange([...arrayValue, defaultValue]);
  };

  const handleRemove = (index: number) => {
    onChange(arrayValue.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, itemValue: unknown) => {
    const newArray = [...arrayValue];
    newArray[index] = itemValue;
    onChange(newArray);
  };

  return (
    <div className="space-y-3">
      {arrayValue.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No items</p>
      ) : (
        arrayValue.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex-1">
              {itemType === "object" || itemType === "array" ? (
                <Card className="border-border">
                  <CardHeader className="py-2 px-3 flex-row items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(index)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 px-3">
                    {itemType === "array" ? (
                      <ArrayField
                        schema={itemSchema}
                        value={item}
                        onChange={(v) => handleItemChange(index, v)}
                        path={[...path, String(index)]}
                        depth={depth + 1}
                      />
                    ) : (
                      <ObjectField
                        schema={itemSchema}
                        value={item as Record<string, unknown>}
                        onChange={(v) => handleItemChange(index, v)}
                        path={[...path, String(index)]}
                        depth={depth + 1}
                      />
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center gap-2">
                  <PrimitiveField
                    schema={itemSchema}
                    value={item}
                    onChange={(v) => handleItemChange(index, v)}
                    path={[...path, String(index)]}
                    depth={depth}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(index)}
                    className="h-9 w-9 p-0 text-destructive hover:text-destructive flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
      <Button variant="outline" size="sm" onClick={handleAdd}>
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
    </div>
  );
}

function FieldRenderer({
  name,
  schema,
  value,
  onChange,
  path,
  depth,
  required,
}: FieldProps & { name: string }) {
  const type = getSchemaType(schema);

  if (type === "object" || type === "array") {
    return (
      <CollapsibleSection
        name={name}
        schema={schema}
        value={value}
        onChange={onChange}
        path={path}
        depth={depth}
        required={required}
      />
    );
  }

  return (
    <PrimitiveField
      name={name}
      schema={schema}
      value={value}
      onChange={onChange}
      path={path}
      depth={depth}
      required={required}
    />
  );
}

function PrimitiveField({
  name,
  schema,
  value,
  onChange,
  path,
  depth,
  required,
}: FieldProps & { name?: string }) {
  const type = getSchemaType(schema);
  const label = schema.title || (name ? formatLabel(name) : undefined);
  const description = schema.description;
  const hasEnum = schema.enum && schema.enum.length > 0;

  // Handle boolean
  if (type === "boolean") {
    return (
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="space-y-0.5">
          {label && (
            <Label className="text-sm font-medium">
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </Label>
          )}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <Switch
          checked={Boolean(value)}
          onCheckedChange={onChange}
        />
      </div>
    );
  }

  // Handle enum/select
  if (hasEnum) {
    return (
      <div className="space-y-2">
        {label && (
          <Label className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        <Select
          value={value !== undefined ? String(value) : undefined}
          onValueChange={(v) => {
            // Try to convert back to original type
            const enumVal = schema.enum?.find((e) => String(e) === v);
            onChange(enumVal ?? v);
          }}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {schema.enum!.map((option) => (
              <SelectItem key={String(option)} value={String(option)}>
                {String(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Handle number
  if (type === "number" || type === "integer") {
    return (
      <div className="space-y-2">
        {label && (
          <Label className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        <Input
          type="number"
          value={value !== undefined ? String(value) : ""}
          onChange={(e) => {
            const num = type === "integer" ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
            onChange(isNaN(num) ? undefined : num);
          }}
          min={schema.minimum}
          max={schema.maximum}
        />
      </div>
    );
  }

  // Handle string with multiline hint
  const isMultiline = schema.format === "textarea" || (schema.maxLength && schema.maxLength > 200);

  if (isMultiline) {
    return (
      <div className="space-y-2 col-span-full">
        {label && (
          <Label className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        <Textarea
          value={value !== undefined ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      </div>
    );
  }

  // Default: string input
  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <Input
        type="text"
        value={value !== undefined ? String(value) : ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </div>
  );
}

// Helper functions
function getSchemaType(schema: JsonSchema): string {
  if (schema.type) {
    return Array.isArray(schema.type) ? schema.type[0] : schema.type;
  }
  if (schema.properties) return "object";
  if (schema.items) return "array";
  if (schema.enum) return "string";
  return "string";
}

function formatLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function getDefaultValue(schema: JsonSchema): unknown {
  if (schema.default !== undefined) return schema.default;
  const type = getSchemaType(schema);
  switch (type) {
    case "object":
      return {};
    case "array":
      return [];
    case "boolean":
      return false;
    case "number":
    case "integer":
      return 0;
    default:
      return "";
  }
}
