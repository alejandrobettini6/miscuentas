# BUSINESS_RULES.md

# MisCuentas - Business Rules Specification

Version: 1.0

---

# Introducción

Este documento define todas las reglas de negocio de MisCuentas.

Estas reglas tienen prioridad sobre cualquier decisión de implementación.

Si alguna decisión técnica entra en conflicto con estas reglas, deberá prevalecer este documento.

---

# Filosofía del producto

MisCuentas NO es un software de contabilidad.

NO es un software financiero.

NO busca reemplazar Excel.

NO busca realizar análisis financieros.

El único objetivo es registrar gastos personales de la manera más rápida posible.

Toda funcionalidad debe justificarse bajo este principio.

---

# Conceptos principales

## Usuario

Cada usuario posee su propia información.

Nunca comparte información con otro usuario.

Toda la información debe estar aislada mediante Row Level Security (RLS).

---

## Cuenta

La aplicación posee exactamente dos cuentas.

Blanco

Barrani

Estas cuentas representan dos contabilidades distintas.

NO representan usuarios.

NO representan billeteras.

NO representan bancos.

Internamente se recomienda utilizar un enum.

Visualmente deben mostrarse únicamente como:

Blanco

Barrani

---

# Independencia entre cuentas

Blanco y Barrani nunca deben mezclarse.

Ejemplo

Blanco

Super

250

Barrani

Super

300

Nunca deben sumarse.

Nunca deben compartir categorías.

Nunca deben compartir movimientos.

Nunca deben compartir "Otros Grandes".

La única excepción es el cálculo del gasto mensual total.

---

# Total mensual

El total mensual es:

Total Blanco

+

Total Barrani

Este valor es utilizado para:

Indicador de límite mensual.

Disponible restante.

Porcentaje consumido.

No existen otros cálculos globales.

---

# Límite mensual

Cada usuario define un límite mensual.

Ejemplo

1500 USD

La aplicación calcula:

Disponible

=

Límite

-

Total Gastado

---

# Indicador de color

Más del 20% disponible

Verde

Entre 20% y 10%

Amarillo

Menos del 10%

Naranja

Menor a cero

Rojo

---

# Cotización del dólar

Cada cuenta posee su propia cotización.

USD Blanco

USD Barrani

Pueden ser iguales.

Pueden ser distintas.

Pueden modificarse en cualquier momento.

---

# Cambio de cotización

Modificar la cotización NO modifica movimientos existentes.

Cada movimiento conserva la cotización utilizada al momento de su creación.

Los nuevos movimientos utilizarán la nueva cotización.

---

# Monedas soportadas

Actualmente

USD

ARS

Visualmente siempre se muestra USD.

Internamente debe quedar preparado para soportar nuevas monedas.

---

# Conversión

Movimiento en USD

No requiere conversión.

Movimiento en ARS

Debe convertirse utilizando la cotización correspondiente a la cuenta seleccionada.

El resultado convertido será almacenado junto con el movimiento.

---

# Categorías

Existen categorías fijas.

Nunca pueden modificarse.

Nunca pueden eliminarse.

Nunca pueden cambiar de orden.

Las categorías son:

- Super
- Delivery
- Auto
- Salud
- Servicios
- Nina
- Salidas
- Pelo
- Gym
- Limpieza

---

# Categoría Otros

Todo gasto que no pertenezca a una categoría fija pertenece a Otros.

Existen dos tipos de Otros.

---

## Otros generales

Son gastos pequeños.

Ejemplos

Golosinas

Tornillos

Pilas

Bombita

Lapicera

No interesa conservar el detalle.

Todos se acumulan en una única categoría.

Ejemplo

Otros

25 USD

---

## Otros Grandes

Representan gastos importantes.

No son gastos recurrentes.

Su importe convertido supera los 150 USD.

Ejemplos

Guitarra

Ventanal

Pintura

Notebook

Viaje

En estos casos se solicita un nombre.

Máximo recomendado

Dos palabras.

---

# Umbral de Otros Grandes

La decisión se toma utilizando el importe convertido a USD.

Ejemplo

150 USD

No solicita nombre.

150.01 USD

Solicita nombre.

---

# Acumulación de Otros Grandes

Si ya existe un gasto con el mismo nombre dentro de la misma cuenta

Debe acumularse.

Ejemplo

Blanco

Guitarra

300

Nuevo movimiento

Guitarra

200

Resultado

Guitarra

500

---

# Separación por cuenta

Esta acumulación solamente ocurre dentro de la misma cuenta.

Ejemplo

Blanco

Guitarra

300

Barrani

Guitarra

300

Resultado

Se mantienen separados.

Nunca deben combinarse.

---

# Registro de movimientos

Cada movimiento se almacena individualmente.

Nunca se modifica el historial para calcular acumulados.

Los acumulados son consecuencia de sumar movimientos.

Nunca al revés.

---

# Información almacenada por movimiento

Cada movimiento debe registrar:

UUID

Usuario

Cuenta

Timestamp

Fecha

Hora

Categoría

Detalle (opcional)

Moneda original

Importe original

Cotización utilizada

Importe convertido a USD

---

# Registro de categorías fijas

Flujo

Seleccionar categoría

↓

Ingresar importe

↓

Cerrar teclado

↓

Registrar automáticamente

↓

Actualizar acumulado

↓

Mostrar Toast

No existe botón Guardar.

---

# Registro en Otros

Seleccionar Otros

↓

Ingresar importe

↓

Conversión

↓

¿Mayor a 150 USD?

No

↓

Acumular en Otros

Sí

↓

Solicitar nombre

↓

Registrar como Otro Grande

---

# Último movimiento

Cada categoría conserva referencia al último movimiento registrado.

Ese movimiento será utilizado para:

Mostrar (+20)

Editar

Eliminar

Deshacer

---

# Edición

Solamente puede editarse el último movimiento.

Nunca movimientos anteriores.

Modificar un movimiento debe recalcular automáticamente:

Acumulado

Último movimiento

Disponible mensual

Porcentaje

Indicadores

---

# Eliminación

Solamente puede eliminarse el último movimiento.

Debe solicitar confirmación.

Eliminar implica:

Remover movimiento.

Recalcular acumulado.

Actualizar disponible.

Actualizar porcentaje.

---

# Deshacer

Después de registrar un movimiento

Existe una ventana de 15 segundos.

Durante ese tiempo

Puede revertirse completamente.

Debe funcionar aunque:

La aplicación pase a segundo plano.

Chrome permanezca abierto.

---

# Doble interacción

Mientras un movimiento se registra

No debe permitirse:

Doble click

Doble tap

Segundo registro

---

# Offline

Si no existe conexión

El movimiento se registra localmente.

Debe visualizarse inmediatamente.

Queda marcado como pendiente.

Cuando vuelve Internet

Debe sincronizarse automáticamente.

Sin intervención del usuario.

---

# Conflictos Offline

Si la sincronización falla

El movimiento permanece pendiente.

Nunca debe perderse información.

---

# Exportar CSV

El CSV representa un resumen mensual.

Debe contener cuatro columnas.

Categoría Barrani

Monto Barrani

Categoría Blanco

Monto Blanco

Las categorías deben respetar el mismo orden visual.

Si una cuenta posee menos filas

Completar con filas vacías.

---

# Exportar Logs

Debe contener absolutamente todos los movimientos.

Columnas mínimas

Timestamp

Fecha

Hora

Cuenta

Categoría

Detalle

Moneda Original

Importe Original

Cotización

USD Convertido

---

# Exportar JSON

Debe contener toda la información necesaria para reconstruir completamente la aplicación.

Debe incluir

Configuración

Movimientos

Categorías

Cotizaciones

Límite

No incluir información de autenticación.

---

# Reset Mes

Reset elimina

Todos los movimientos.

Todos los acumulados.

Todos los Otros Grandes.

Reset NO elimina

Usuario.

Configuraciones.

Cotizaciones.

Límite mensual.

Sesión iniciada.

---

# Login

El usuario no puede registrarse.

Los usuarios son creados manualmente desde Supabase.

La aplicación únicamente permite iniciar sesión.

La sesión permanece iniciada indefinidamente hasta logout manual.

---

# Reglas de consistencia

Siempre deben cumplirse las siguientes igualdades.

Total Blanco

=

Suma categorías Blanco

Total Barrani

=

Suma categorías Barrani

Total Gastado

=

Total Blanco

+

Total Barrani

Disponible

=

Límite

-

Total Gastado

---

# Reglas de visualización

Visualmente nunca se muestran movimientos individuales.

Visualmente solamente se muestran acumulados.

Los movimientos individuales existen únicamente para:

Edición

Eliminación

Deshacer

Export Logs

Futuras funcionalidades

---

# Casos borde

Cambio de cotización

No recalcula movimientos existentes.

Cambio del límite

Recalcula inmediatamente el disponible.

Disponible negativo

Debe mostrarse en rojo.

Otros Grandes repetidos

Siempre acumulan.

Cambio de cuenta

Nunca comparte datos.

Offline

Nunca pierde movimientos.

Error de sincronización

Nunca elimina movimientos pendientes.

---

# Regla más importante del proyecto

Ante cualquier duda de implementación debe priorizarse siempre la siguiente regla:

Registrar un gasto debe requerir el menor esfuerzo posible.

Si una funcionalidad agrega complejidad sin mejorar significativamente la experiencia del usuario, no debe implementarse.