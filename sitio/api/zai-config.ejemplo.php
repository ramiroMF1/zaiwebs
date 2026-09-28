<?php
/* ============================================================
   Configuración de Zai — ARCHIVO DE EJEMPLO
   ------------------------------------------------------------
   Para prender el chat:
     1. Copiá este archivo en esta misma carpeta (api/) con el nombre
        zai-config.php
     2. Pegá tu clave de la API de Anthropic entre las comillas.
     3. Guardá. Zai aparece solo en la web; no hay que tocar nada más.

   Para apagarlo, borrá la clave (o el archivo zai-config.php).

   La clave es secreta: no la mandes por chat, email ni WhatsApp, y no
   la subas a ningún otro lado. Si alguna vez se filtra, borrala en la
   consola de Anthropic y creá otra.

   Este ejemplo se puede quedar en el servidor: con la clave vacía no
   hace nada, y pedirlo por la web no muestra su contenido.
   ============================================================ */

return [
    'anthropic_api_key' => '',
];
