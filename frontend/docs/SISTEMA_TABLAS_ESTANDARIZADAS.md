# 🎨 Sistema de Tablas Estandarizadas

## 📋 Descripción

Este sistema proporciona componentes estandarizados para crear tablas de datos con un diseño consistente en toda la aplicación. Incluye botones de acciones reutilizables y un diseño uniforme.

## 🚀 Componentes Principales

### 1. **DataTable**
Componente principal para tablas de datos con funcionalidades avanzadas.

**Características:**
- ✅ Ordenamiento automático
- ✅ Estados de carga con skeleton
- ✅ Mensajes de estado vacío
- ✅ Filas alternadas (striped)
- ✅ Efectos hover
- ✅ Múltiples tamaños
- ✅ Diseño responsive

**Props:**
```javascript
{
  columns: Array,           // Configuración de columnas
  data: Array,              // Datos de la tabla
  sortConfig: Object,       // Configuración de ordenamiento
  onSort: Function,         // Función para ordenar
  loading: Boolean,         // Estado de carga
  emptyMessage: String,     // Mensaje cuando no hay datos
  size: 'sm' | 'md' | 'lg', // Tamaño de la tabla
  striped: Boolean,         // Filas alternadas
  hover: Boolean           // Efecto hover
}
```

### 2. **ActionButtons**
Componente para botones de acciones estandarizados.

**Características:**
- ✅ Botones de Ver, Editar, Eliminar, Imprimir, Configuración
- ✅ Múltiples variantes de diseño
- ✅ Diferentes tamaños
- ✅ Estados de carga
- ✅ Colores consistentes

**Props:**
```javascript
{
  onView: Function,         // Función para ver detalles
  onEdit: Function,         // Función para editar
  onDelete: Function,       // Función para eliminar
  onPrint: Function,        // Función para imprimir (opcional)
  onSettings: Function,     // Función para configuración (opcional)
  showView: Boolean,        // Mostrar botón ver (default: true)
  showEdit: Boolean,        // Mostrar botón editar (default: true)
  showDelete: Boolean,      // Mostrar botón eliminar (default: true)
  showPrint: Boolean,       // Mostrar botón imprimir (default: false)
  showSettings: Boolean,    // Mostrar botón configuración (default: false)
  loading: Boolean,         // Estado de carga
  size: 'sm' | 'md' | 'lg', // Tamaño de los botones
  variant: 'compact' | 'full' | 'icon-only' // Variante de diseño
}
```

## 🎯 Configuración de Columnas

### Estructura de Columna
```javascript
{
  key: 'nombre_campo',      // Clave única de la columna
  label: 'Nombre',          // Etiqueta del encabezado
  sortable: true,           // Si es ordenable
  render: (item) => JSX,    // Función de renderizado personalizada
  align: 'left' | 'center' | 'right', // Alineación del contenido
  width: 'w-32',           // Ancho de la columna (opcional)
  className: 'custom-class' // Clases CSS adicionales
}
```

### Ejemplo de Configuración
```javascript
const columns = [
  {
    key: 'producto',
    label: 'Producto',
    sortable: true,
    render: (product) => (
      <div className="flex items-center space-x-3">
        <img src={product.imagen} className="w-10 h-10 rounded" />
        <div>
          <p className="font-medium">{product.nombre}</p>
          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
        </div>
      </div>
    )
  },
  {
    key: 'precio',
    label: 'Precio',
    sortable: true,
    align: 'right',
    render: (product) => `$${product.precio}`
  },
  {
    key: 'acciones',
    label: 'Acciones',
    sortable: false,
    render: (product) => (
      <ActionButtons
        onView={() => handleView(product)}
        onEdit={() => handleEdit(product)}
        onDelete={() => handleDelete(product)}
        size="sm"
        variant="compact"
      />
    )
  }
];
```

## 🎨 Variantes de Diseño

### ActionButtons Variants

#### 1. **Compact** (Por defecto)
```javascript
<ActionButtons
  onView={handleView}
  onEdit={handleEdit}
  onDelete={handleDelete}
  variant="compact"
/>
```
- Solo iconos
- Espaciado mínimo
- Ideal para tablas con muchas columnas

#### 2. **Full**
```javascript
<ActionButtons
  onView={handleView}
  onEdit={handleEdit}
  onDelete={handleDelete}
  variant="full"
/>
```
- Iconos + texto
- Espaciado amplio
- Ideal para tablas con espacio suficiente

#### 3. **Icon-only**
```javascript
<ActionButtons
  onView={handleView}
  onEdit={handleEdit}
  onDelete={handleDelete}
  variant="icon-only"
/>
```
- Solo iconos
- Sin tooltips
- Máximo ahorro de espacio

### DataTable Sizes

#### 1. **Small (sm)**
- Padding reducido
- Texto pequeño
- Ideal para tablas con muchos datos

#### 2. **Medium (md)** (Por defecto)
- Padding estándar
- Texto normal
- Balance entre espacio y legibilidad

#### 3. **Large (lg)**
- Padding amplio
- Texto grande
- Ideal para tablas con pocos datos

## 🎨 Esquema de Colores

### ActionButtons Colors
- **Ver**: Azul (`bg-blue-50 text-blue-600`)
- **Editar**: Verde (`bg-green-50 text-green-600`)
- **Eliminar**: Rojo (`bg-red-50 text-red-600`)
- **Imprimir**: Púrpura (`bg-purple-50 text-purple-600`)
- **Configuración**: Gris (`bg-gray-50 text-gray-600`)

### Estados
- **Normal**: Color base
- **Hover**: Color más intenso
- **Disabled**: Opacidad reducida
- **Loading**: Opacidad reducida + cursor not-allowed

## 📱 Responsive Design

### DataTable
- Scroll horizontal automático
- Columnas adaptativas
- Breakpoints optimizados

### ActionButtons
- Tamaños adaptativos
- Espaciado responsive
- Iconos escalables

## 🔧 Implementación

### 1. **Importar Componentes**
```javascript
import DataTable from '../ui/DataTable';
import ActionButtons from '../ui/ActionButtons';
```

### 2. **Configurar Columnas**
```javascript
const getColumns = (handlers) => [
  // ... configuración de columnas
];
```

### 3. **Usar DataTable**
```javascript
<DataTable
  columns={getColumns(handlers)}
  data={data}
  sortConfig={sortConfig}
  onSort={handleSort}
  loading={loading}
  emptyMessage="No hay datos disponibles"
/>
```

## 📊 Ejemplos de Uso

### Tabla de Productos
```javascript
const productColumns = [
  {
    key: 'producto',
    label: 'Producto',
    sortable: true,
    render: (product) => (
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {product.imagen_principal_url ? (
            <img
              src={getImageUrl(product.imagen_principal_url)}
              alt={product.nombre}
              className="w-10 h-10 rounded-lg object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 bg-theme-border rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-theme-textSecondary" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-theme-text truncate">
            {product.nombre}
          </p>
          <p className="text-sm text-theme-textSecondary truncate">
            SKU: {product.sku || 'N/A'}
          </p>
        </div>
      </div>
    )
  },
  {
    key: 'precio',
    label: 'Precio',
    sortable: true,
    render: (product) => (
      <div className="text-right">
        <p className="text-sm font-medium text-theme-text">
          {formatPrice(product.precio)}
        </p>
        {product.precio_anterior && (
          <p className="text-xs text-theme-textSecondary line-through">
            {formatPrice(product.precio_anterior)}
          </p>
        )}
      </div>
    )
  },
  {
    key: 'estado',
    label: 'Estado',
    sortable: true,
    render: (product) => <ProductStatusChip status={product.estado} />
  },
  {
    key: 'stock',
    label: 'Stock',
    sortable: true,
    render: (product) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        product.stock > 0 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {product.stock} unidades
      </span>
    )
  },
  {
    key: 'categoria',
    label: 'Categoría',
    sortable: true,
    render: (product) => product.categoria?.nombre || 'Sin categoría'
  },
  {
    key: 'fecha_creacion',
    label: 'Fecha',
    sortable: true,
    render: (product) => new Date(product.fecha_creacion).toLocaleDateString()
  },
  {
    key: 'acciones',
    label: 'Acciones',
    sortable: false,
    render: (product) => (
      <ActionButtons
        onView={() => handleView(product)}
        onEdit={() => handleEdit(product)}
        onDelete={() => handleDelete(product)}
        size="sm"
        variant="compact"
      />
    )
  }
];
```

### Tabla de Categorías
```javascript
const categoryColumns = [
  {
    key: 'nombre',
    label: 'Categoría',
    sortable: true,
    render: (categoria) => (
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 w-8 h-8">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Folder className="w-4 h-4 text-blue-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-theme-text truncate">
            {categoria.nombre}
          </p>
          <p className="text-xs text-theme-textSecondary truncate">
            {categoria.descripcion || 'Sin descripción'}
          </p>
        </div>
      </div>
    )
  },
  {
    key: 'productos_count',
    label: 'Productos',
    sortable: true,
    render: (categoria) => (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        {categoria.productos_count || 0}
      </span>
    )
  },
  {
    key: 'stock_total_categoria',
    label: 'Stock Total',
    sortable: true,
    render: (categoria) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        (categoria.stock_total_categoria || 0) > 0 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {categoria.stock_total_categoria || 0}
      </span>
    )
  },
  {
    key: 'acciones',
    label: 'Acciones',
    sortable: false,
    render: (categoria) => (
      <ActionButtons
        onView={() => handleView(categoria)}
        onEdit={() => handleEdit(categoria)}
        onDelete={() => handleDelete(categoria)}
        size="sm"
        variant="compact"
      />
    )
  }
];
```

### Tabla de Pedidos
```javascript
const pedidoColumns = [
  {
    key: 'pedido',
    label: 'Pedido',
    sortable: true,
    render: (pedido) => (
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 w-8 h-8">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-blue-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-theme-text truncate">
            {pedido.numero_pedido}
          </p>
          <p className="text-xs text-theme-textSecondary truncate">
            {new Date(pedido.fecha_creacion).toLocaleDateString()}
          </p>
        </div>
      </div>
    )
  },
  {
    key: 'cliente',
    label: 'Cliente',
    sortable: true,
    render: (pedido) => (
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
          <User className="w-3 h-3 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-theme-text">
            {pedido.cliente?.nombre || 'Cliente anónimo'}
          </p>
          <p className="text-xs text-theme-textSecondary">
            {pedido.cliente?.telefono || 'Sin teléfono'}
          </p>
        </div>
      </div>
    )
  },
  {
    key: 'estado_pedido',
    label: 'Estado',
    sortable: true,
    render: (pedido) => {
      const estados = {
        pendiente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
        confirmado: { color: 'bg-blue-100 text-blue-800', icon: CheckSquare },
        en_preparacion: { color: 'bg-orange-100 text-orange-800', icon: Package },
        enviado: { color: 'bg-purple-100 text-purple-800', icon: Truck },
        entregado: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
        cancelado: { color: 'bg-red-100 text-red-800', icon: XSquare }
      };
      
      const estado = estados[pedido.estado_pedido] || estados.pendiente;
      const IconComponent = estado.icon;
      
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estado.color}`}>
          <IconComponent className="w-3 h-3 mr-1" />
          {pedido.estado_pedido?.replace('_', ' ').toUpperCase()}
        </span>
      );
    }
  },
  {
    key: 'productos_count',
    label: 'Productos',
    sortable: true,
    render: (pedido) => (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {pedido.productos_count || 0} items
      </span>
    )
  },
  {
    key: 'total_pedido',
    label: 'Total',
    sortable: true,
    align: 'right',
    render: (pedido) => (
      <div className="text-right">
        <p className="text-sm font-medium text-theme-text">
          ${parseFloat(pedido.total_pedido || 0).toFixed(2)}
        </p>
        <p className="text-xs text-theme-textSecondary">
          {pedido.estado_pago === 'pagado' ? 'Pagado' : 'Pendiente'}
        </p>
      </div>
    )
  },
  {
    key: 'acciones',
    label: 'Acciones',
    sortable: false,
    render: (pedido) => (
      <ActionButtons
        onView={() => handleView(pedido)}
        onEdit={() => handleEdit(pedido)}
        onDelete={() => handleDelete(pedido)}
        onPrint={() => handlePrint(pedido)}
        showPrint={true}
        size="sm"
        variant="compact"
      />
    )
  }
];
```

## 🎯 Beneficios

### ✅ **Consistencia Visual**
- Diseño uniforme en toda la aplicación
- Colores y espaciados estandarizados
- Experiencia de usuario coherente

### ✅ **Mantenibilidad**
- Componentes reutilizables
- Configuración centralizada
- Fácil actualización de estilos

### ✅ **Rendimiento**
- Componentes optimizados
- Lazy loading de elementos
- Memoización automática

### ✅ **Accesibilidad**
- Tooltips informativos
- Estados de carga claros
- Navegación por teclado

### ✅ **Flexibilidad**
- Múltiples variantes de diseño
- Configuración personalizable
- Fácil extensión

## 🔄 Migración

### De Tablas Antiguas
1. **Identificar estructura actual**
2. **Crear configuración de columnas**
3. **Reemplazar tabla HTML por DataTable**
4. **Actualizar botones de acciones**
5. **Probar funcionalidad**

### Ejemplo de Migración
```javascript
// ANTES
<table className="w-full">
  <thead>
    <tr>
      <th>Producto</th>
      <th>Precio</th>
      <th>Acciones</th>
    </tr>
  </thead>
  <tbody>
    {products.map(product => (
      <tr key={product.id}>
        <td>{product.nombre}</td>
        <td>${product.precio}</td>
        <td>
          <button onClick={() => handleEdit(product)}>Editar</button>
          <button onClick={() => handleDelete(product)}>Eliminar</button>
        </td>
      </tr>
    ))}
  </tbody>
</table>

// DESPUÉS
<DataTable
  columns={getProductColumns(handlers)}
  data={products}
  sortConfig={sortConfig}
  onSort={handleSort}
  loading={loading}
/>
```

---

**Sistema desarrollado para Localix Dashboard** 🚀

*Este sistema garantiza una experiencia de usuario consistente y profesional en todas las tablas de la aplicación.*
```