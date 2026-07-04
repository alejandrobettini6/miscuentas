# MisCuentas

Aplicación web minimalista para registrar gastos personales (Blanco / Barrani), optimizada para iPhone.

Stack: React + TypeScript + Vite + Tailwind. Persistencia local por defecto. Supabase listo para conectar después.

---

## Requisitos

- **Node.js 20 o superior** (recomendado LTS)
- npm (viene con Node)

Comprobá la versión:

```bash
node -v
npm -v
```

Si no tenés Node: instalalo desde https://nodejs.org

---

## Cómo correrlo en local (paso a paso)

### 1. Abrí la carpeta del proyecto

```bash
cd /Users/ale/MISCUENTAS
```

### 2. Instalá dependencias (solo la primera vez, o si cambia `package.json`)

```bash
npm install
```

### 3. Variables de entorno

Debe existir el archivo `.env` en la raíz del proyecto con:

```env
VITE_SUPABASE_URL=https://yssobjxxfweyfodvexjw.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_DATA_MODE=local
```

- `VITE_DATA_MODE=local` → la app funciona **sin** configurar Supabase (datos en el navegador).
- Cuando configures Supabase, cambiá a `VITE_DATA_MODE=supabase`.

Si no tenés `.env`, copiá el ejemplo:

```bash
cp .env.example .env
```

### 4. Arrancá el servidor de desarrollo

```bash
npm run dev
```

### 5. Abrí la app en el navegador

Vite imprime una URL, normalmente:

```text
http://localhost:5173
```

Abrila en Chrome o Safari.

### 6. Login en modo local

En modo local **cualquier email y contraseña no vacíos** funcionan. Ejemplo:

- Email: `ale@test.com`
- Password: `123456`

La sesión queda guardada hasta que uses **Cerrar sesión** en el menú.

### 7. Probar desde el iPhone (misma Wi‑Fi)

1. En la Mac, con `npm run dev` corriendo, anotá la IP local:

```bash
ipconfig getifaddr en0
```

2. En la terminal de Vite debería aparecer también algo como `http://192.168.x.x:5173`.
3. En el iPhone, abrí Safari y entrá a esa URL.
4. Si no carga: en `vite.config.ts` no hace falta cambiar nada; corré:

```bash
npm run dev -- --host
```

y usá la URL de red que muestre Vite.

---

## Scripts útiles

| Comando | Qué hace |
|--------|----------|
| `npm run dev` | Servidor local |
| `npm run build` | Build de producción |
| `npm run preview` | Previsualiza el build |
| `npm test` | Tests de lógica de negocio |

---

## Qué podés validar ya

- Login (modo local)
- Resumen: disponible, barra, total gastado, colores
- Tabs Blanco / Barrani (independientes)
- Registrar gasto en categoría fija (teclado numérico, sin botón Guardar)
- Toggle **USD / ARS** al cargar importe
- Otros (≤ 150 USD) y Otros Grandes (> 150 USD con nombre)
- Editar / eliminar solo el último movimiento de cada fila
- Deshacer 15 segundos (sigue contando en background)
- Menú: cotizaciones, límite, export CSV / Logs / JSON
- Reset Mes (doble confirmación; no borra configuración)

El período de gastos **no se corta por calendario**: acumula hasta que hagas **Reset Mes**.

---

## Supabase (más adelante)

El schema está en:

```text
supabase/schema.sql
```

Cuando quieras conectar:

1. En Supabase → SQL Editor → pegá y ejecutá `supabase/schema.sql`.
2. Authentication → Providers → Email habilitado.
3. Authentication → Users → **Add user** (email + password). Desactivá confirmación de email si está activa.
4. En `.env` poné `VITE_DATA_MODE=supabase` y las keys del proyecto.
5. Reiniciá `npm run dev`.
6. Login con el usuario creado en Supabase.

Los repositorios de Supabase ya están implementados en `src/repositories/supabase/`.

---

## GitHub Pages (más adelante)

1. En `vite.config.ts`, cambiá `base` a `'/NOMBRE_DEL_REPO/'`.
2. `npm run build`
3. Publicá la carpeta `dist/` con GitHub Pages.

---

## Estructura principal

```text
src/
  components/   UI y layout
  pages/        Login, Home
  contexts/     Auth, Settings
  hooks/        expenses, summary
  services/     reglas de negocio
  repositories/ local + supabase
  types/        enums y modelos
supabase/
  schema.sql    schema + RLS
```

---

## Notas

- En modo `local`, los datos viven en `localStorage` del navegador.
- No subas `.env` a Git (está en `.gitignore`). Usá `.env.example` como plantilla.
