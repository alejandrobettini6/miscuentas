# TECHNICAL_DESIGN.md

# MisCuentas - Technical Design Document (TDD)

Version: 1.0

---

# 1. Objetivo

Este documento describe la arquitectura técnica de MisCuentas.

El objetivo principal de la arquitectura es que la aplicación pueda evolucionar durante años sin necesidad de grandes refactorizaciones.

Las prioridades técnicas son:

- Simplicidad
- Escalabilidad
- Bajo acoplamiento
- Alta cohesión
- Código mantenible
- Mobile First
- Offline First
- Seguridad
- Testabilidad

La aplicación debe comportarse como un producto profesional aunque inicialmente tenga un único usuario.

---

# 2. Stack Tecnológico

## Frontend

- React
- TypeScript (Strict Mode)
- Vite

## UI

- React
- CSS Modules o Tailwind CSS (preferentemente Tailwind)
- Lucide React (íconos)
- React Hot Toast (toasts)

## Estado

- TanStack Query (React Query)
- React Context

## Formularios

No utilizar librerías de formularios.

Los formularios son extremadamente pequeños.

Utilizar React puro.

## Backend

Supabase

Incluye:

- PostgreSQL
- Authentication
- Storage
- RLS

## Testing

- Vitest
- React Testing Library

## Linting

ESLint

## Formatting

Prettier

---

# 3. Arquitectura

Se utilizará una arquitectura por capas.

Nunca mezclar responsabilidades.

```
Presentation

↓

Application

↓

Domain

↓

Infrastructure

↓

Supabase
```

---

# 4. Estructura de Carpetas

```
src/

components/
layout/
ui/
icons/

pages/
Login/
Home/

features/

auth/
settings/
expenses/
summary/
export/

hooks/

contexts/

services/

repositories/

models/

types/

constants/

utils/

validators/

lib/

styles/

assets/

config/

tests/
```

Cada carpeta debe tener una única responsabilidad.

---

# 5. Componentes

Los componentes deben ser extremadamente pequeños.

Regla:

Un componente ideal no supera las 150 líneas.

Si comienza a crecer:

dividirlo.

---

# 6. Responsabilidades

## Components

Renderizan.

No contienen lógica de negocio.

---

## Hooks

Manejan estado.

No realizan consultas SQL.

---

## Services

Implementan lógica de negocio.

Ejemplos:

Convertir monedas

Registrar movimiento

Calcular disponible

Calcular porcentaje

---

## Repositories

Único punto que conoce Supabase.

Toda lectura y escritura pasa por aquí.

Nunca acceder a Supabase desde un componente.

---

## Utils

Funciones puras.

Sin efectos secundarios.

---

# 7. Domain

Todo el negocio debe vivir aquí.

Ejemplos

ExpenseCalculator

CurrencyConverter

MonthlyBudget

SummaryCalculator

ExportService

Nunca colocar reglas de negocio en componentes.

---

# 8. Estado Global

React Context únicamente para:

Usuario autenticado

Configuración

Tema (si existiera)

No utilizar Context para movimientos.

---

# 9. Estado Remoto

Utilizar TanStack Query.

Todas las consultas deben cachearse.

Toda mutación debe invalidar únicamente las queries necesarias.

Nunca invalidar todo el cache.

---

# 10. Offline First

La aplicación debe seguir funcionando sin conexión.

Arquitectura

```
Usuario

↓

UI

↓

Queue

↓

Supabase

```

Si no existe conexión

↓

Guardar movimiento en cola

↓

Actualizar UI

↓

Esperar conexión

↓

Sincronizar

---

# 11. Cola Offline

Cada operación pendiente tendrá:

UUID

Tipo

Payload

Fecha

Estado

Intentos

Último error

La cola debe sobrevivir al refresh.

---

# 12. Estrategia de Sincronización

Cuando vuelva internet

Procesar operaciones una por una.

Nunca en paralelo.

Orden FIFO.

Si una falla

Detener sincronización.

Conservar resto pendiente.

---

# 13. Manejo de Errores

Errores de validación

Toast rojo.

Errores de conexión

Toast amarillo.

Errores internos

Registrar log.

Mostrar mensaje genérico.

Nunca mostrar errores SQL.

---

# 14. Configuración

Toda configuración pertenece al usuario.

USD Blanco

USD Barrani

Límite mensual

Debe cargarse al iniciar sesión.

Debe cachearse.

Debe actualizarse automáticamente.

---

# 15. Login

Utilizar Supabase Auth.

Email

Password

Persistencia de sesión.

Nunca implementar registro.

Nunca implementar recuperación.

---

# 16. Seguridad

Toda consulta debe pasar RLS.

Nunca confiar en el frontend.

Todo UPDATE debe validar usuario.

Todo DELETE debe validar usuario.

---

# 17. Base de Datos

La aplicación trabajará principalmente con cuatro entidades.

Users

Settings

Expenses

OfflineQueue (opcional si se sincroniza localmente)

Los acumulados NO se almacenan.

Siempre se calculan.

---

# 18. Expense

Cada movimiento posee:

UUID

UserId

AccountType

Category

Description

OriginalCurrency

OriginalAmount

ExchangeRate

UsdAmount

CreatedAt

UpdatedAt

DeletedAt (opcional)

---

# 19. Settings

UserId

UsdWhite

UsdCash

MonthlyLimit

UpdatedAt

---

# 20. Enum AccountType

Nunca utilizar strings.

```
WHITE

CASH
```

La UI mostrará

Blanco

Barrani

---

# 21. Enum Currency

```
USD

ARS
```

Preparado para agregar

EUR

GBP

etc.

---

# 22. Enum Category

No utilizar strings sueltos.

Crear enum.

SUPER

DELIVERY

AUTO

SALUD

SERVICIOS

NINA

SALIDAS

PELO

GYM

LIMPIEZA

OTHER

---

# 23. Otros Grandes

No crear una categoría nueva.

Siguen perteneciendo a

OTHER

La diferencia es:

Description != null

---

# 24. Conversión de Moneda

Toda conversión debe realizarse en un único servicio.

Nunca duplicar lógica.

```
CurrencyConverter
```

Responsabilidades

Conversión

Redondeo

Formato

---

# 25. Cálculo de Totales

Toda suma debe realizarse mediante

SummaryCalculator

Debe calcular

Total Blanco

Total Barrani

Total General

Disponible

Porcentaje

---

# 26. Exportaciones

Crear un servicio independiente.

ExportService

Responsabilidades

CSV

Logs

JSON

Nunca generar archivos desde componentes.

---

# 27. Validaciones

Crear Validators.

Ejemplos

Monto

Cotización

Límite

Nombre de Otro Grande

No realizar validaciones dentro de componentes.

---

# 28. Formateo

Crear Formatters.

CurrencyFormatter

DateFormatter

PercentageFormatter

---

# 29. Hooks

Ejemplos

useLogin

useSettings

useExpenses

useSummary

useOfflineQueue

Cada hook debe tener una única responsabilidad.

---

# 30. Componentes UI

Ejemplos

Button

Input

Modal

Toast

Tabs

ProgressBar

CategoryCard

HamburgerMenu

Todos reutilizables.

---

# 31. Performance

Nunca recalcular acumulados manualmente.

Utilizar memoización.

Evitar renders innecesarios.

Listas pequeñas.

No optimizar prematuramente.

---

# 32. Accesibilidad

Todos los botones deben tener

aria-label

Todos los inputs

label

Contraste AA.

---

# 33. Logging

Crear Logger.

Desarrollo

console

Producción

preparado para integrar Sentry.

---

# 34. Convenciones

Funciones

camelCase

Componentes

PascalCase

Constantes

UPPER_CASE

Enums

PascalCase

Interfaces

I solamente si el equipo lo decide.

Preferentemente no.

---

# 35. Tests

Prioridad

Servicios

Calculadoras

Conversión

Validadores

Exportaciones

No invertir esfuerzo excesivo testeando componentes visuales.

---

# 36. Futuras Extensiones

La arquitectura debe permitir incorporar fácilmente:

- Nuevas monedas.
- Nuevas cuentas además de Blanco/Barrani.
- Historial mensual.
- Restauración desde JSON.
- Estadísticas.
- PWA.
- Biometría.
- Notificaciones.
- Sincronización en tiempo real.

Sin necesidad de modificar el núcleo del dominio.

---

# 37. Despliegue

Frontend

GitHub Pages.

Backend

Supabase.

No existen servidores propios.

No existe API propia.

Todo debe funcionar mediante HTTPS.

---

# 38. Principios de Desarrollo

Antes de implementar cualquier funcionalidad el desarrollador debe preguntarse:

- ¿Esta lógica pertenece realmente a este componente?
- ¿Estoy duplicando código?
- ¿Existe un servicio que debería encargarse?
- ¿Estoy rompiendo el principio de responsabilidad única?
- ¿Esto será fácil de mantener dentro de dos años?

---

# 39. Principio Fundamental

La arquitectura debe estar diseñada para que agregar una nueva funcionalidad no implique modificar código existente, sino extenderlo.

Se priorizará siempre un diseño desacoplado, limpio y testeable por sobre soluciones rápidas o atajos de implementación.