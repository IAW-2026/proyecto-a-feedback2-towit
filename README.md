# TowIt — Feedback (Proyecto IAW 2026)

Aplicación **Feedback** de la aplicación web TowIt, del [Proyecto IAW 2026](https://iaw-2026.github.io/proyecto/) 

---

## Deploy

Link al deploy de producción: https://proyecto-a-feedback2-towit.vercel.app/

## Usuarios de prueba

Listado de usuarios disponibles para probar la aplicación (definidos en Clerk):

- `< Tower / Driver >` 
    * driver+clerk_test@iaw.com
    * tower+clerk_test@iaw.com
- `<Customer / Rider>` 
   * rider+clerk_test@iaw.com
   * customerpayments+clerk_test@iaw.com
- `<Admin>`
   * admin-feedback+clerk_test@example.com

La contraseña de todos los usuarios es la definida por la cátedra



## Sitios

- `/` — redirecciona al sitio apropiado según sesión y rol. Si el usuario es tower/customer lo redirige a su perfil, si es un admin al dashboard de administrador.
- `/history` — historial de viajes del usuario que aún no han sido calificados
- `/rate/{trip_id}` — calificar al otro usuario del viaje
- `/profile/{clerk_id}` — perfil público con calificación promedio y reciente
- `/report/{trip_id}` — reportar al otro usuario del viaje
- `/ratings-history` — historial de calificaciones dadas
- `/admin/dashboard` — panel de administración, muestra calificación promedio reciente de los usuarios, calificaciones y reportes recientes
- `/admin/ratings` — permite al administrador acceder a todas las calificaciones
- `/admin/ratings/{rating_id}` — permite al administrador ver información de una calificación en particular
- `/admin/reports` — permite al administrador acceder a todos los reportes
- `/admin/reports/{report_id}` — permite al administrador ver información sobre un reporte, así como cambiar su estado

## Instrucciones

- Para calificar un viaje, acceder al historial de viajes sin calificar `/history` 
- Para ver informacion de un viaje calificado, acceder a `/ratings-history` y hacer click en el viaje deseado
- Para reportar un viaje, si este ya está calificado acceda a la información de dicha calificación. Si este está sin calificar, dirijáse a la página de calificación de dicho viaje, y allí tendrá la opción de reportar.

## Descripción del proyecto

TowIt Feedback es una aplicación web de feedback que forma parte de un sistema de solicitud de remolques similar a Uber. En él, los usuarios pueden ofrecerse a remolcar otros autos (Towers) o pedir ser remolcados (Customers); cada servicio completado se denomina "trip" o "viaje". El módulo de feedback se encarga de todo lo relacionado a la reputación: calificar al otro participante del viaje, dejar comentarios y etiquetas, ver el historial, y reportar comportamientos inadecuados.

La aplicación distingue tres tipos de usuarios: Towers y Customers, que interactúan entre sí al realizar y calificar viajes, y Admins, que moderan la plataforma. Los Admins pueden revisar y resolver reportes, ver todas las calificaciones y supervisar la salud general del sistema desde un dashboard.

## Notas para la corrección

- **Decisión de diseño — roles:** el rol de admin se modela como un `publicMetadata.role === 'admin-feedback'` en Clerk, definido en el login y consultado en `app/page.tsx:14` para decidir la redirección inicial. No existe una tabla `Admin` propia en la base de datos.

- **Decisión de diseño — promedio de calificaciones:** se mantiene una tabla desnormalizada (`UserRating` / `average_ratings`) que se actualiza junto con cada nueva calificación, para evitar recalcular el promedio en cada lectura del perfil.

- **Migraciones:** se aplican con `pnpm migrate` (runner en `scripts/migrate.mjs`), que registra los archivos aplicados en `schema_migrations`. Los seeds de viajes de prueba viven en `scripts/seed-trips.mjs`.

- **Limitaciones conocidas:**
  - Los administradores pueden cambiar el estado de un reporte, que queda reflejado en la base de datos del sistema. Sin embargo, esto no tiene impacto alguno sobre los usuarios.
  - Al cargar una página como administrador, momentáneamente se muestra el topbar correspondiente a los usuarios no adminsitradores.

- **API:**
   - La aplicación expone dos endpoints HTTP GET bajo /api/feedback que cualquier servicio externo puede consumir:
      - GET /api/feedback/avg_rating/{id} — devuelve el promedio de calificaciones del usuario cuyo clerk_id es {id}. Lee de la tabla average_ratings. Respuesta: { "avg_rating": number }. Devuelve 404 si el usuario no tiene calificaciones.
      - GET /api/feedback/rating/{trip_id}/{user_id} — devuelve el puntaje (1–5) que {user_id} le asignó al viaje {trip_id}. Lee de la tabla ratings. Respuesta: { "rating": number }. Devuelve 404 si no existe esa calificación.
      Ambos endpoints son de solo lectura y devuelven 500 ante error interno.
  - El endpoint GET /api/admin/dashboard es utilizado por el componente del cliente del dashboard, para realizar polling y actualizar las listas de calificaciones y reportes.
