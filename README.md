# Mi Aventura 🛡️

Tu gestor personal de hábitos, tareas y metas gamificado, inspirado en Habitica.
Todo se guarda **localmente en tu dispositivo** (no necesita internet ni cuenta).

## Cómo funciona el juego

- **Hábitos**: recurrentes, programados por día de la semana. Completarlos da XP, monedas y suma racha. Si no completas un hábito en un día programado, **pierdes vida (HP)**.
- **Pago por hábito**: cada hábito tiene su propio "pago en monedas al completar", editable desde el lápiz del hábito. Así decides cuánto vale cada hábito (ej. gimnasio paga 12, meditar paga 5).
- **Tareas**: pendientes de una sola vez, con fecha límite opcional.
- **Metas**: objetivos grandes divididos en hitos. Cada hito da XP; completar la meta entera da un bonus grande (+100 XP, +50 monedas).
- **Tienda**: crea tus propias recompensas reales ("1 hora de videojuegos", "pedir comida") y cómpralas con las monedas que ganes.
- **Nivel y vida**: al subir de nivel tu vida se restaura. Si tu vida llega a 0, pierdes un nivel y tus monedas.
- **Dificultad**: los hábitos y tareas difíciles dan más XP y monedas (Fácil ×1, Normal ×1.5, Difícil ×2).

## Cómo usarla

### En tu Mac

```bash
cd /Users/sirch/Claudio
python3 -m http.server 8642
```

Luego abre <http://localhost:8642> en tu navegador.

### En tu iPhone (misma red Wi-Fi)

1. En tu Mac, ejecuta el servidor con `--bind 0.0.0.0`:
   ```bash
   python3 -m http.server 8642 --bind 0.0.0.0
   ```
2. Averigua la IP de tu Mac: **Ajustes del Sistema → Wi-Fi → Detalles**.
3. En Safari del iPhone abre `http://<ip-de-tu-mac>:8642`.
4. Toca **Compartir → Añadir a pantalla de inicio** para instalarla como app.

> 💡 Para usarla en el iPhone sin depender de tu Mac, puedes subir esta carpeta
> a un hosting estático gratuito (GitHub Pages, Netlify, Vercel). Al estar en
> HTTPS, el modo sin conexión (service worker) también funcionará en el iPhone.

## Tus datos

- Se guardan en `localStorage` bajo la clave `mi-aventura-v1`, solo en el navegador donde uses la app.
- Desde **Perfil → Exportar mis datos** puedes descargar una copia JSON, e importarla en otro dispositivo.
- **Importante**: los datos no se sincronizan solos entre iPhone y Mac; usa exportar/importar para moverlos.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Estructura de la app |
| `styles.css` | Tema visual RPG |
| `app.js` | Lógica del juego y de la interfaz |
| `sw.js` + `manifest.webmanifest` | Soporte PWA (instalable y offline) |
| `icons/` | Iconos de la app |
