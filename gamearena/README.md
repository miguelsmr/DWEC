# GameArena

Proyecto de 2º DAW que une las prácticas de DWES y DWEC. Autores: Miguel Luzón Prado y Alba Casado García.

- `backend/`: API REST con Spring Boot, JPA y base de datos H2 (DWES).
- `frontend/`: panel del administrador en HTML, Bootstrap y JavaScript, que se conecta a la API con `fetch` (DWEC).

## Cómo ejecutarlo

1. Abrir la carpeta `backend` en IntelliJ y arrancar `GameArenaApplication`. La API queda en `http://localhost:8080`.
2. Abrir `frontend/index.html` con Live Server.
3. Las pruebas de la API están en `backend/postman/GameArena.postman_collection.json` (necesitan la base de datos vacía: borrar la carpeta `data` antes de lanzarlas).
