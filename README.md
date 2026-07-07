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

## Supabase Auth (reset password + Google)

### URL Configuration (Supabase Dashboard)

**Authentication → URL Configuration**

- **Site URL:** `https://alejandrobettini6.github.io/miscuentas/`
- **Redirect URLs:**
  - `http://localhost:5173/**`
  - `http://192.168.*.*:5173/**`
  - `https://alejandrobettini6.github.io/miscuentas/**`

### Restablecer contraseña

1. Login → **¿Olvidaste tu contraseña?**
2. Ingresá email → Supabase envía link
3. Abrí el link → pantalla **Nueva contraseña**

### Login con Google

**Google Cloud Console → OAuth consent screen**

- **App name:** `MisCuentas`
- **Privacy policy:** `https://alejandrobettini6.github.io/miscuentas/privacy.html`

**Google Cloud Console → Credentials → OAuth 2.0 Client ID (Web)**

- **JavaScript origins:** `http://localhost:5173`, `https://alejandrobettini6.github.io`
- **Redirect URI:** `https://TU_PROYECTO.supabase.co/auth/v1/callback`

**Supabase → Authentication → Providers → Google**

- Enable + Client ID + Client Secret de Google

Nota: el subdominio `*.supabase.co` que aparece en la pantalla de Google **no es un secreto**; es el identificador público del proyecto. Para ocultarlo por completo se necesita Custom Domain de Supabase (de pago).

---

## Supabase (base de datos)

El schema está en `supabase/schema.sql`. Ejecutalo en SQL Editor, habilitá Email en Auth, creá usuario manualmente, y usá `VITE_DATA_MODE=supabase`.

---

## GitHub Pages

Deploy automático con GitHub Actions al pushear a `main`.

**URL:** https://alejandrobettini6.github.io/miscuentas/

**Secrets (Settings → Secrets → Actions):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DATA_MODE=supabase`

**Pages:** Settings → Source → **GitHub Actions**

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
