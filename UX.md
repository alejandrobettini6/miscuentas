# UX.md

# MisCuentas - UX Specification

Version: 1.0

---

# Filosofía de UX

MisCuentas NO es una aplicación financiera.
MisCuentas NO intenta competir con Money Manager, Wallet o similares.
El objetivo es reemplazar unas notas del teléfono utilizadas para registrar gastos manualmente.
La aplicación debe sentirse como una herramienta personal.
Toda decisión de UX debe responder una única pregunta:
> ¿Esto hace que registrar un gasto sea más rápido?
Si la respuesta es "no", probablemente no deba implementarse.

---

# Principios

## Mobile First
Toda la aplicación debe diseñarse primero para iPhone.
Desktop únicamente adapta el layout.
Nunca al revés.

---

## Menor cantidad posible de clicks

Registrar un gasto fijo debe requerir:
1 click sobre la categoría
escribir el número
cerrar teclado
Fin.
No debe existir botón Guardar.

---

## Bajo costo cognitivo
El usuario nunca debe pensar:
"¿Dónde estaba esa opción?"
Las categorías siempre aparecen en el mismo lugar.
Nunca cambian de orden.
Nunca desaparecen.

---

## Minimalismo

No utilizar:

- dashboards
- gráficos
- pie charts
- barras comparativas
- widgets innecesarios
- sombras exageradas
- degradados
- animaciones llamativas
Todo debe sentirse similar a una aplicación nativa de Apple.

---

# Navegación

La aplicación solamente tiene dos pantallas principales.
Login
Home
No existen más pantallas.
Todo ocurre desde Home.
---

# Login

Debe contener únicamente:
Email
Password
Botón Login
Nada más.
No existe:
Registro
Recuperar contraseña
Confirmación de email

---

# Home

La pantalla principal se divide en cuatro bloques.

────────────────────

Header

────────────────────

Resumen mensual

────────────────────

Tabs

────────────────────

Categorías

---

# Header
Parte superior.
Izquierda
Menú hamburguesa.
Centro
Mes actual.
Ejemplo
Julio 2026
Derecha
Vacío.
No agregar iconos innecesarios.

---

# Menú hamburguesa
Debe abrir desde la izquierda.
Animación suave.
No pantalla nueva.
Debe contener tres secciones.

---

## General

USD Blanco
USD Barrani
Límite mensual
Cada uno funciona como botón.

Al tocar:
abre teclado numérico
guardar automáticamente
sin botón Guardar.

---

## Datos
Exportar CSV
Exportar Logs
Exportar JSON

---
## Peligro
Reset Mes
Debe mostrarse separado visualmente.

---

# Resumen mensual

Ocupa la parte superior de la pantalla.
Debe mostrar solamente:
Disponible este mes
Ejemplo
235 USD
Debajo
Barra de progreso
Debajo
83%
Debajo
Total gastado
1250 USD
Este total es:
Blanco + Barrani
No mostrar detalle aquí.

---

# Colores del indicador
Disponible mayor al 20%
Verde
Disponible entre 20% y 10%
Amarillo
Disponible menor al 10%
Naranja
Disponible negativo
Rojo
Nunca utilizar otros colores.

---

# Tabs

Dos tabs.

Blanco
Barrani
Siempre visibles.
Nunca scroll horizontal.
Al cambiar:
No cambiar de pantalla.
Simplemente actualizar categorías.

---

# Vista de categorías

Siempre el mismo orden.
Super
Delivery
Auto
Salud
Servicios
Nina
Salidas
Pelo
Gym
Limpiez
Otros
Luego
Otros Grandes
(si existen)
Ordenados por monto descendente.

---

# Cada fila
Debe contener:
Nombre categoría
Monto acumulado
Último movimiento
Botón editar
Botón eliminar
Ejemplo
Super
320 USD
(+20)

✏️

🗑️

---
# Monto
Siempre mostrar USD.
Nunca mostrar pesos.
Aunque internamente el movimiento haya sido ARS.

---

# Último movimiento
Siempre mostrar:
(+20)
(-15)
etc.
Debe desaparecer cuando exista un nuevo movimiento.

---

# Editar

Solamente permitido sobre el último movimiento.
Al tocar:
Abrir teclado numérico.
Modificar importe.
Cerrar teclado.
Guardar automáticamente.
Actualizar acumulado.

Toast verde.

---
# Eliminar
Solamente permitido sobre el último movimiento.
Solicitar confirmación.
Eliminar.
Actualizar acumulado.
Toast verde.

---

# Registrar movimiento
Las categorías funcionan como botones.
No existen formularios.
No existen pantallas extra.
Al tocar:
Super
↓
Abrir teclado numérico.
↓
Ingresar importe.
↓
Cerrar teclado.
↓
Guardar automáticamente.
↓
Toast.
Fin.

---

# Toast
Éxito
Verde
Error
Rojo
Duración
2 segundos.

---

# Undo
Después de registrar.
Mostrar Toast.
Ejemplo
Movimiento registrado
Deshacer
Debe permanecer exactamente
15 segundos.
Debe seguir funcionando aunque:
Chrome pase a segundo plano.
La aplicación permanezca abierta.

---

# Otros
Flujo
Usuario toca Otros.
↓
Abrir teclado.
↓
Ingresar importe.
↓
Convertir a USD.
↓
¿Mayor a 150?
NO
↓
Sumar a
Otros
Fin.
SI
↓
Abrir modal.
↓
Solicitar nombre.
Máximo dos palabras.
↓
Guardar.

---

# Otros Grandes
Se muestran debajo de Otros.
Ejemplo
Otros
25

---------

Guitarra
300
Ventanal
800
Pintura
450
Ordenados por monto.
Mayor primero.

---

# Repetición

Si vuelve a registrarse

Guitarra
200
Resultado
Guitarra
500
Nunca duplicar filas.
Siempre acumular.

---

# Blanco y Barrani

Nunca mezclar.
Cada tab mantiene completamente independiente:
Totales
Categorías
Otros
Otros Grandes
No compartir información.

---

# Animaciones
Muy pocas.
Abrir menú.
Abrir modal.
Toast.
Cambio de tab.
Nada más.

---

# Inputs

Todos los importes
inputmode="decimal"
Abrir teclado numérico.
Aceptar hasta dos decimales.

---

# Formato numérico

USD

Separador de miles con punto.
Dos decimales solamente cuando existan.

Ejemplos

25
125
1.250
15.250
1.250,50

---

# Responsive

Prioridad absoluta
390 px
430 px
(ancho típico iPhone)
Luego
Tablet
Luego
Desktop

---

# Desktop

No crear una interfaz distinta.
Simplemente centrar el contenido.
Máximo ancho recomendado
480 px
La aplicación debe seguir viéndose como una aplicación móvil.

---

# Estados vacíos
Si una categoría nunca tuvo gastos
Mostrar
0 USD
No ocultarla.

---

# Estados de carga

Nunca bloquear la aplicación completa.
Utilizar indicadores pequeños.
Mientras se registra un movimiento
bloquear solamente esa categoría.

---

# Doble click

No permitir doble click.
No permitir doble tap.
Mientras un movimiento está procesándose
deshabilitar interacción.

---

# Offline

Si no existe conexión
Registrar movimiento normalmente.
Mostrar pequeño indicador
Pendiente de sincronización
Cuando vuelva internet
Sincronizar automáticamente.
El usuario no debe realizar ninguna acción.

---

# Accesibilidad

Botones grandes.
Área táctil mínima
44x44 px.
Contraste alto.
Texto legible.
No depender únicamente del color.

---

# Objetivo final

Un usuario que ya conoce la aplicación debe ser capaz de:
Abrirla
Registrar un gasto
Cerrar la aplicación
En menos de tres segundos.
Ese objetivo tiene prioridad sobre cualquier otra decisión de UX.