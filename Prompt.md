MISCUENTAS

Quiero desarrollar una aplicación web completa llamada MisCuentas.
La aplicación será utilizada exclusivamente por mí, aunque debe diseñarse correctamente para soportar múltiples usuarios desde el inicio.
El objetivo NO es construir una aplicación financiera compleja.
El objetivo es reemplazar unas notas del teléfono donde actualmente llevo mis gastos, haciendo que registrar un gasto sea todavía más rápido.
Toda decisión de arquitectura, diseño y UX debe priorizar:

* velocidad
* simplicidad
* minimalismo
* uso desde teléfono
* bajo costo cognitivo

La aplicación debe sentirse como una aplicación nativa de iPhone.
No quiero pantallas sobrecargadas.
No quiero dashboards.
No quiero gráficos.
No quiero funcionalidades innecesarias.
Cada click debe estar justificado.

⸻

Stack tecnológico

Elegí un stack completamente gratuito.
Debe utilizar:

* React
* TypeScript
* Vite
* GitHub Pages para el frontend
* Supabase para backend
* Supabase Authentication
* Supabase Database (PostgreSQL)

No quiero backend propio.
No quiero servidores.
No quiero costos.
Toda la aplicación debe poder desplegarse gratuitamente.
Además quiero que generes:

* estructura de carpetas
* arquitectura del proyecto
* explicación de cada módulo
* instrucciones de instalación
* instrucciones de despliegue
* variables de entorno
* README completo

⸻

Arquitectura
La aplicación debe tener una arquitectura limpia.
Separar correctamente:
UI
Servicios
Hooks
Context
Modelos
Repositorio de datos
Configuración
Tipos
Utilidades
No quiero lógica mezclada dentro de componentes.
Todo debe ser fácilmente mantenible.
Utilizar TypeScript estricto.

⸻

Autenticación
Utilizar Supabase Auth.
No quiero implementar una pantalla de registro.
El usuario será creado manualmente desde Supabase.
La aplicación solamente debe tener Login.
Puede ser mediante email + contraseña.
No quiero confirmación de email.
No quiero recuperación de contraseña.
La sesión debe permanecer iniciada indefinidamente hasta que el usuario cierre sesión manualmente.

⸻
Seguridad
Implementar correctamente:
RLS (Row Level Security)
Cada usuario solamente puede acceder a sus propios datos.
No debe existir ninguna posibilidad de acceder a datos de otro usuario.

⸻

Persistencia
Toda la información vive en Supabase.
Nunca utilizar LocalStorage como almacenamiento principal.
Pero…
Implementar una cola offline.
Si el usuario registra un movimiento sin conexión:
guardar temporalmente localmente
mostrar el movimiento inmediatamente
cuando vuelva Internet
sincronizar automáticamente
el usuario nunca debe notar la diferencia.

⸻

Filosofía de la aplicación
La aplicación registra movimientos.
Internamente cada movimiento debe guardarse individualmente.
Pero visualmente solamente se muestran acumulados.
Nunca mostrar listas de movimientos al usuario.
Eso queda únicamente para Export Logs.

⸻

Modelo de datos
Cada movimiento debe almacenar:

UUID
Usuario
Timestamp
Fecha
Hora
Tipo de cuenta
Blanco
Barrani
Categoría
Detalle

(opcional)

Moneda original
ARS
USD
Importe original
Cotización utilizada
Importe convertido a USD
Todo debe almacenarse aunque actualmente no se muestre.

⸻
Blanco y Barrani
NO son usuarios.
NO son billeteras.
Representan dos contabilidades distintas.
Nunca deben mezclarse.
Siempre deben mantenerse completamente independientes.
Internamente recomiendo modelarlas como un enum.
NO utilizar los textos “Blanco” y “Barrani” en la lógica del código.
Utilizar un enum y solamente mostrar esos nombres en pantalla.

⸻

Monedas

La aplicación trabaja siempre mostrando USD.
Los movimientos pueden cargarse en:

USD
ARS
Si se cargan en ARS
deben convertirse utilizando la cotización configurada para esa cuenta.
Cada movimiento debe guardar la cotización utilizada.
Si posteriormente cambia la cotización
los movimientos anteriores NO deben recalcularse.
Solamente afecta nuevos movimientos.
Toda la UI muestra USD.
Sin embargo quiero dejar preparado el código para soportar futuras monedas.
Agregar comentarios indicando dónde habría que modificar para soportar EUR u otras monedas.

⸻

Configuración
Debe existir un menú hamburguesa arriba a la izquierda.
Dentro habrá tres secciones.
General
Cotización USD Blanco
Cotización USD Barrani
Límite mensual recomendado
Cada uno debe abrir un input numérico.
Guardar automáticamente al perder foco.
No utilizar botón Guardar.

⸻

Datos
Exportar CSV
Exportar Logs
Exportar JSON

⸻

Peligro
Reset Mes

⸻

Pantalla principal
La aplicación debe abrir directamente en la pantalla principal.
No quiero menú inicial.
La pantalla principal debe mostrar arriba:
Disponible este mes
Ejemplo
235 USD
Una barra horizontal de progreso
El porcentaje restante.
Colores:
Más de 20% restante
Verde
Entre 20% y 10%
Amarillo
Menos del 10%
Naranja
Menos de 0
Rojo
También mostrar
Total gastado
(sumando Blanco + Barrani)
No hace falta mostrar detalle aquí.

⸻
Debajo
Tabs
Blanco | Barrani
Al cambiar de tab
se muestran solamente las categorías correspondientes a esa cuenta.

⸻

Vista de categorías
Siempre mantener el mismo orden.

Categorías fijas
Super
Delivery
Auto
Salud
Servicios
Nina
Salidas
Pelo
Gym
Limpieza
Luego
Otros
Luego
Otros grandes
(si existen)
Ordenados por monto descendente.

⸻
Cada fila muestra
Nombre
Monto acumulado
Último movimiento
Ejemplo
Super
320 (+20)
A la derecha
Editar
Eliminar
Estos botones solamente existen para el último movimiento.
Nunca permitir editar movimientos viejos.

⸻
Registrar movimiento
La pantalla principal YA ES el formulario.
No existen pantallas extra.
Al tocar cualquier categoría fija
abrir inmediatamente teclado numérico.
inputmode decimal.
No teclado completo.
Al cerrar el teclado
registrar automáticamente.
Mostrar toast verde.
No pedir confirmación.
No botón Guardar.

⸻

Otros

Si el usuario toca Otros
abrir teclado.
Ingresar monto.
Si el monto convertido es menor o igual a 150 USD
sumar al acumulado de Otros.

Fin.
Si supera 150 USD
abrir modal
Solicitar nombre

(1 o 2 palabras)

Registrar dentro de Otros Grandes.
Si vuelve a registrar el mismo nombre
acumular.
Ejemplo
Guitarra
300
Luego
Guitarra
200
Resultado
Guitarra
500
Siempre separados entre Blanco y Barrani.
Nunca mezclar.

⸻

Editar
Siempre solamente el último movimiento.
Editar abre nuevamente teclado.
Modificar importe.
Recalcular automáticamente.
Toast verde.

⸻

Eliminar
Siempre solamente el último movimiento.
Solicitar confirmación.
Eliminar.
Actualizar acumulado.

⸻

Undo
Después de registrar
mostrar Toast
15 segundos
Con botón
Deshacer
Si el usuario minimiza Chrome
el temporizador debe continuar correctamente.
Si vuelve antes de los 15 segundos
todavía debe poder deshacer.

⸻

Evitar doble registro
Bloquear doble click.
Bloquear doble tap.
Mientras se procesa un movimiento
no permitir registrar otro.

⸻
Reset Mes
Botón dentro del menú.
Mostrar doble confirmación.
Al aceptar
Eliminar movimientos.
NO eliminar configuraciones.
NO eliminar usuario.
NO eliminar cotizaciones.
NO eliminar límite.

⸻

Exportar CSV
Debe generar cuatro columnas.
Categoría Barrani
Monto Barrani
Categoría Blanco
Monto Blanco
Si un lado tiene menos categorías
completar con filas vacías.

⸻

Exportar Logs

Debe contener todos los movimientos.
Timestamp
Fecha
Hora
Cuenta
Categoría
Detalle
Moneda Original
Importe Original
Cotización

USD

⸻

Exportar JSON
Debe exportar toda la información.
Debe poder utilizarse en el futuro para restaurar datos.

⸻

UX

La aplicación debe sentirse como una aplicación nativa de iPhone.

Botones grandes.
Tipografía grande.
Mucho espacio.
Muy poco texto.
Muy pocos colores.
Nada de sombras exageradas.
Nada de dashboards.
Nada de gráficos.
Nada de tablas complejas.
Registrar un gasto debe tomar menos de tres segundos.
Toda la interfaz debe ser completamente responsive.
Optimizada primero para móvil.
Desktop solamente debe adaptarse correctamente.

⸻

Calidad
Quiero código profesional.
Componentes pequeños.
Responsabilidad única.
Nombres claros.
Sin duplicación.
Con comentarios únicamente donde realmente aporten valor.
Crear tests unitarios para la lógica de negocio.
Documentar todas las decisiones importantes.
No implementar soluciones rápidas si existe una arquitectura más limpia.
Priorizar mantenibilidad.
Pensar la aplicación como si fuera un producto que evolucionará durante muchos años.