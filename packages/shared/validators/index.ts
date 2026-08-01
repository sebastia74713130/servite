export function validateProductForm(data: {
  name?: string;
  price?: number;
  category_id?: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.name?.trim()) errors.name = 'El nombre es obligatorio';
  if (data.price === undefined || data.price === null || data.price <= 0)
    errors.price = 'El precio debe ser mayor a 0';
  if (!data.category_id) errors.category_id = 'Selecciona una categoría';
  return errors;
}

export function validateCategoryForm(data: { name?: string }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.name?.trim()) errors.name = 'El nombre es obligatorio';
  return errors;
}

export function validateTableForm(data: {
  table_number?: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.table_number?.trim()) errors.table_number = 'El número de mesa es obligatorio';
  return errors;
}

export function validateTableCode(code: string): boolean {
  return code.trim().length > 0;
}
