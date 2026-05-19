[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/H_UJlsIX)
# feedback

Aplicación **Feedback** del [Proyecto IAW 2026](https://iaw-2026.github.io/proyecto/) — comisión `<!-- completar -->`.

Esta app corresponde al módulo de reseñas y calificaciones en los proyectos de tipo **A (Transporte)**, **B (Delivery)** y **C (Marketplace)**.

---

Enunciado completo: <https://iaw-2026.github.io/proyecto/>

## Database migrations

The project uses plain SQL migrations stored in [migrations/](migrations/). Apply them with:

```bash
pnpm migrate
```

The runner is implemented in [scripts/migrate.mjs](scripts/migrate.mjs) and records applied files in `schema_migrations`.
