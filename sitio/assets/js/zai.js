(function () {
  'use strict';

  /* ============================================================
     ZAI — chat del asistente virtual (lado del navegador)
     ------------------------------------------------------------
     Al cargar pregunta a api/zai.php si el asistente está activo, o
     sea, si ya se cargó la clave de API en el servidor. Si no lo está,
     no hace NADA: no dibuja el botón ni descarga su hoja de estilos.
     Así el chat se puede subir apagado y prenderse después con solo
     cargar la clave, sin tocar ningún HTML.

     La charla se guarda en sessionStorage: sobrevive a pasar de una
     página a otra del sitio, y se borra al cerrar la pestaña. Cada
     pedido manda además un código de conversación al azar y la página;
     el servidor guarda preguntas y respuestas 90 días, con emails y
     teléfonos tachados (ver zai.php).

     Cuando Zai deriva al equipo, la respuesta trae derivar:true y un
     resumen, y debajo del mensaje aparece un botón de WhatsApp con ese
     resumen ya escrito.

     Vista previa sin servidor PHP: en localhost, agregar ?zai=demo a la
     dirección dibuja el chat con respuestas de prueba.
     ============================================================ */

  var API = '/api/zai.php';
  var TELEFONO = '5492923677208';
  var MAX_MENSAJES = 20;      // igual que en zai.php
  var MAX_CARACTERES = 800;   // igual que en zai.php
  var CLAVE_SESION = 'zai-charla';
  var CLAVE_ID = 'zai-conversacion';

  var SALUDO = '¡Hola! Soy Zai, el asistente virtual de Zaiwebs. Te puedo contar qué hacemos, cómo trabajamos y si una web o un asistente con IA le sirven a tu negocio. ¿En qué te ayudo?';
  var SUGERENCIAS = [
    '¿Qué hacen?',
    '¿Cómo funcionaría un asistente en mi negocio?',
    '¿Cuánto tarda una web?'
  ];

  // Cara de Zai (logo-zai/zai-a-sonrisa.svg). Los ojos van en un grupo
  // aparte para que zai.css los haga parpadear.
  var ICONO_ZAI = '<svg class="zai-cara" viewBox="0 0 1200 1200" aria-hidden="true"><circle cx="600" cy="600" r="600" fill="#0A2540"/><ellipse cx="600" cy="600" rx="533" ry="334" fill="#FFFAF1"/><g class="zai-cara__ojos"><ellipse cx="368" cy="575" rx="108" ry="148" fill="#00B8D4"/><ellipse cx="832" cy="575" rx="108" ry="148" fill="#00B8D4"/></g><path d="M478 812 Q600 892 722 812" fill="none" stroke="#0A2540" stroke-width="38" stroke-linecap="round"/></svg>';
  var ICONO_CERRAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>';
  var ICONO_ENVIAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke-linejoin="round"/></svg>';
  var ICONO_WHATSAPP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.5.1-.2 0-.4 0-.5C10 9 9.4 7.6 9.1 7c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2.1 3.2 5 4.4.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z"/><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.2-.4-4.5-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>';

  // Misma versión de caché que el HTML que pidió este archivo.
  var VERSION = (function () {
    var yo = document.currentScript;
    return (yo && yo.src && yo.src.split('?v=')[1]) || '1';
  })();

  var esLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  var modoDemo = esLocal && /[?&]zai=demo(&|$)/.test(location.search);

  function medir(evento) {
    if (typeof umami !== 'undefined' && umami && typeof umami.track === 'function') {
      try { umami.track(evento); } catch (e) { /* que nunca frene el chat */ }
    }
  }

  function leerCharla() {
    try {
      var guardada = JSON.parse(sessionStorage.getItem(CLAVE_SESION) || '[]');
      return Array.isArray(guardada) ? guardada : [];
    } catch (e) {
      return [];
    }
  }

  function guardarCharla(charla) {
    try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify(charla)); } catch (e) { /* modo privado */ }
  }

  // Código al azar que agrupa las preguntas de una misma charla en el
  // registro del servidor. No sale de ningún dato de la persona.
  function idConversacion() {
    try {
      var guardado = sessionStorage.getItem(CLAVE_ID);
      if (guardado && /^[a-f0-9]{24}$/.test(guardado)) return guardado;
    } catch (e) { /* modo privado */ }
    var bytes = new Uint8Array(12);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    var nuevo = Array.prototype.map.call(bytes, function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
    try { sessionStorage.setItem(CLAVE_ID, nuevo); } catch (e) { /* modo privado */ }
    return nuevo;
  }

  function crear(etiqueta, clase, texto) {
    var nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto != null) nodo.textContent = texto;
    return nodo;
  }

  function estaActivo() {
    if (modoDemo) return Promise.resolve(true);
    if (!window.fetch || !window.Promise) return Promise.resolve(false);
    return fetch(API, { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : { activo: false }; })
      .then(function (datos) { return !!(datos && datos.activo === true); })
      .catch(function () { return false; });
  }

  function armar() {
    var hoja = document.createElement('link');
    hoja.rel = 'stylesheet';
    hoja.href = '/assets/css/zai.css?v=' + VERSION;
    document.head.appendChild(hoja);

    // Con esta clase zai.css esconde el botón flotante de WhatsApp. Si Zai
    // no arranca, no se agrega y ese botón queda como único contacto.
    document.body.classList.add('zai-activo');

    /* ---- Botón que abre el chat ---- */
    var lanzador = crear('button', 'zai-lanzador');
    lanzador.type = 'button';
    lanzador.setAttribute('aria-controls', 'zai-panel');
    lanzador.setAttribute('aria-expanded', 'false');
    lanzador.setAttribute('aria-label', 'Abrir el chat con Zai, el asistente virtual');
    lanzador.innerHTML = ICONO_ZAI;

    /* ---- Panel ----
       Todo el HTML fijo va de una vez. Lo que escribe la persona o
       responde Zai entra SIEMPRE por textContent, nunca como HTML. */
    var panel = crear('section', 'zai-panel');
    panel.id = 'zai-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Chat con Zai, el asistente virtual de Zaiwebs');
    panel.innerHTML =
      '<div class="zai-panel__cabeza">' +
        '<span class="zai-avatar" aria-hidden="true">' + ICONO_ZAI + '</span>' +
        '<div class="zai-panel__quien">' +
          '<p class="zai-panel__nombre">Zai</p>' +
          '<p class="zai-panel__rol">Asistente virtual de Zaiwebs</p>' +
        '</div>' +
        '<button type="button" class="zai-cerrar" aria-label="Cerrar el chat">' + ICONO_CERRAR + '</button>' +
      '</div>' +
      '<div class="zai-mensajes" role="log" aria-live="polite"></div>' +
      '<div class="zai-sugerencias"></div>' +
      '<form class="zai-form">' +
        '<label class="visually-hidden" for="zai-texto">Tu mensaje para Zai</label>' +
        '<textarea id="zai-texto" rows="1" maxlength="' + MAX_CARACTERES + '" placeholder="Escribí tu pregunta…"></textarea>' +
        '<button type="submit" class="zai-enviar" aria-label="Enviar mensaje">' + ICONO_ENVIAR + '</button>' +
      '</form>' +
      '<div class="zai-pie">' +
        '<a class="zai-whatsapp" href="https://wa.me/' + TELEFONO + '" target="_blank" rel="noopener">' + ICONO_WHATSAPP + '<span>Seguir por WhatsApp</span></a>' +
        '<p class="zai-aviso">Zai es una IA y puede equivocarse. Guardamos las charlas, sin emails ni teléfonos, para mejorarlo. <a href="/privacidad">Privacidad</a></p>' +
      '</div>';

    document.body.appendChild(lanzador);
    document.body.appendChild(panel);

    var mensajes = panel.querySelector('.zai-mensajes');
    var sugerencias = panel.querySelector('.zai-sugerencias');
    var formulario = panel.querySelector('.zai-form');
    var campo = panel.querySelector('textarea');
    var botonEnviar = panel.querySelector('.zai-enviar');
    var whatsapp = panel.querySelector('.zai-whatsapp');

    var charla = leerCharla();
    var enviando = false;
    var ultimoFoco = null;

    /* ---- Globo y aviso ----
       A los 4 segundos Zai cabecea, aparece un globo que "dice" Zai y un
       1 sobre la cara. El aviso es verdad: el saludo de Zai está esperando
       en el chat. El globo sale UNA vez por visita y se va solo a los 8
       segundos; el aviso queda, aun pasando de página, hasta que se abre
       el chat. Moverse todo el tiempo cansa y se lee como publicidad. */
    var CLAVE_SALUDO = 'zai-saludo';
    var CLAVE_VISTO = 'zai-visto';
    var ETIQUETA = 'Abrir el chat con Zai, el asistente virtual';

    var burbuja = crear('div', 'zai-burbuja');
    burbuja.hidden = true;
    burbuja.innerHTML =
      '<button type="button" class="zai-burbuja__texto">' +
        '<span class="zai-burbuja__largo">¡Hola! Soy Zai. ¿Tenés una duda? Preguntame</span>' +
        '<span class="zai-burbuja__corto">¿Te ayudo?</span>' +
      '</button>' +
      '<button type="button" class="zai-burbuja__cerrar" aria-label="Cerrar el mensaje de Zai">' + ICONO_CERRAR + '</button>';
    document.body.appendChild(burbuja);

    var aviso = crear('span', 'zai-lanzador__aviso', '1');
    aviso.setAttribute('aria-hidden', 'true');
    aviso.hidden = true;
    lanzador.appendChild(aviso);

    function leerMarca(clave) {
      try { return sessionStorage.getItem(clave) === '1'; } catch (e) { return false; }
    }

    function guardarMarca(clave) {
      try { sessionStorage.setItem(clave, '1'); } catch (e) { /* modo privado */ }
    }

    function mostrarAviso() {
      aviso.hidden = false;
      lanzador.setAttribute('aria-label', ETIQUETA + '. Tenés un mensaje nuevo');
    }

    function ocultarBurbuja() {
      burbuja.hidden = true;
    }

    function ocultarAvisos() {
      ocultarBurbuja();
      aviso.hidden = true;
      lanzador.setAttribute('aria-label', ETIQUETA);
      guardarMarca(CLAVE_VISTO);
    }

    // Si ya charló en esta visita, el saludo no es un mensaje nuevo.
    if (charla.length) guardarMarca(CLAVE_VISTO);

    if (!leerMarca(CLAVE_VISTO)) {
      if (leerMarca(CLAVE_SALUDO)) {
        mostrarAviso();   // otra página de la misma visita: solo el aviso
      } else {
        setTimeout(function () {
          if (!panel.hidden) return;
          guardarMarca(CLAVE_SALUDO);
          lanzador.classList.add('zai-lanzador--saluda');
          mostrarAviso();
          burbuja.hidden = false;
          medir('zai-burbuja');
          setTimeout(ocultarBurbuja, 8000);
        }, 4000);
      }
    }

    lanzador.addEventListener('animationend', function (e) {
      if (e.animationName === 'zai-saludo') lanzador.classList.remove('zai-lanzador--saluda');
    });
    burbuja.querySelector('.zai-burbuja__texto').addEventListener('click', function () {
      medir('zai-burbuja-abrir');
      lanzador.focus();   // al cerrar el chat, el foco vuelve al botón y no al globo oculto
      abrir();
    });
    burbuja.querySelector('.zai-burbuja__cerrar').addEventListener('click', ocultarBurbuja);

    function bajarAlFinal() {
      mensajes.scrollTop = mensajes.scrollHeight;
    }

    function pintar(rol, texto, variante) {
      var clase = 'zai-msg ' + (rol === 'user' ? 'zai-msg--visitante' : 'zai-msg--zai');
      if (variante) clase += ' ' + variante;
      var burbuja = crear('div', clase, texto);
      mensajes.appendChild(burbuja);
      bajarAlFinal();
      return burbuja;
    }

    /* El mensaje de WhatsApp lleva el resumen que armó Zai o, si todavía no
       hay, la primera pregunta de la charla: así el equipo sabe de qué venía
       hablando la persona sin que la tenga que repetir. Lo manda ella, igual
       que el formulario de contacto. */
    function urlWhatsapp(resumen) {
      var texto = 'Hola Zaiwebs, hablé con Zai en la web.';
      if (resumen) {
        texto += ' ' + resumen;
      } else {
        for (var i = 0; i < charla.length; i++) {
          if (charla[i].role === 'user') {
            texto += ' Mi consulta: ' + charla[i].content.slice(0, 300);
            break;
          }
        }
      }
      return 'https://wa.me/' + TELEFONO + '?text=' + encodeURIComponent(texto);
    }

    // El botón fijo del pie usa el último resumen que armó Zai, si hay.
    function actualizarWhatsapp() {
      var resumen = '';
      for (var i = charla.length - 1; i >= 0; i--) {
        if (charla[i].resumen) { resumen = charla[i].resumen; break; }
      }
      whatsapp.href = urlWhatsapp(resumen);
    }

    // Botón que aparece debajo de la respuesta en la que Zai deriva al equipo.
    function pintarDerivar(resumen) {
      var boton = crear('a', 'zai-derivar');
      boton.href = urlWhatsapp(resumen);
      boton.target = '_blank';
      boton.rel = 'noopener';
      boton.innerHTML = ICONO_WHATSAPP + '<span>Seguir por WhatsApp</span>';
      boton.addEventListener('click', function () { medir('zai-whatsapp-derivado'); });
      mensajes.appendChild(boton);
      bajarAlFinal();
    }

    function pintarTodo() {
      mensajes.textContent = '';
      pintar('assistant', SALUDO);
      charla.forEach(function (m) {
        pintar(m.role, m.content);
        if (m.derivar) pintarDerivar(m.resumen || '');
      });
      sugerencias.hidden = charla.length > 0;
      actualizarWhatsapp();
    }

    SUGERENCIAS.forEach(function (texto) {
      var boton = crear('button', 'zai-sugerencia', texto);
      boton.type = 'button';
      boton.addEventListener('click', function () { enviar(texto); });
      sugerencias.appendChild(boton);
    });

    function ajustarAlto() {
      campo.style.height = 'auto';
      campo.style.height = Math.min(campo.scrollHeight, 120) + 'px';
    }

    function pedirRespuesta() {
      if (modoDemo) {
        return new Promise(function (listo) {
          setTimeout(function () {
            listo({ ok: true, datos: {
              texto: 'Esto es una vista previa local: acá Zai no responde de verdad. Así se ve cuando deriva al equipo.',
              derivar: true,
              resumen: 'Quiero ver cómo funciona un asistente como Zai para mi negocio.'
            } });
          }, 900);
        });
      }
      return fetch(API, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // A la API van solo rol y texto: lo del botón de WhatsApp que se
          // guarda en la sesión es para volver a dibujarlo, no para Zai.
          mensajes: charla.map(function (m) { return { role: m.role, content: m.content }; }),
          conversacion: idConversacion(),
          pagina: location.pathname
        })
      }).then(function (r) {
        return r.json().then(
          function (datos) { return { ok: r.ok, datos: datos }; },
          function () { return { ok: false, datos: {} }; }
        );
      });
    }

    function enviar(texto) {
      texto = (texto || '').trim().slice(0, MAX_CARACTERES);
      if (!texto || enviando) return;

      if (charla.length + 1 > MAX_MENSAJES) {
        pintar('assistant', 'Llegamos al límite de esta charla. Para seguir, escribinos por WhatsApp y te responde el equipo.', 'zai-msg--aviso');
        return;
      }

      enviando = true;
      botonEnviar.disabled = true;
      campo.value = '';
      ajustarAlto();
      sugerencias.hidden = true;

      charla.push({ role: 'user', content: texto });
      guardarCharla(charla);
      pintar('user', texto);
      actualizarWhatsapp();
      medir('zai-mensaje');

      var escribiendo = crear('div', 'zai-msg zai-msg--zai zai-escribiendo');
      escribiendo.setAttribute('aria-label', 'Zai está escribiendo');
      escribiendo.innerHTML = '<span></span><span></span><span></span>';
      mensajes.appendChild(escribiendo);
      bajarAlFinal();

      /* Si no hay respuesta, la pregunta se saca de la charla guardada:
         la API exige que visitante y Zai se alternen, y una pregunta sin
         respuesta rompería el siguiente envío. En pantalla queda visible. */
      function fallo(mensaje) {
        charla.pop();
        guardarCharla(charla);
        pintar('assistant', mensaje, 'zai-msg--aviso');
      }

      pedirRespuesta()
        .then(function (res) {
          escribiendo.remove();
          if (res.ok && res.datos && typeof res.datos.texto === 'string') {
            var derivar = res.datos.derivar === true;
            var resumen = typeof res.datos.resumen === 'string' ? res.datos.resumen : '';
            charla.push({ role: 'assistant', content: res.datos.texto, derivar: derivar, resumen: resumen });
            guardarCharla(charla);
            pintar('assistant', res.datos.texto);
            if (derivar) pintarDerivar(resumen);
            actualizarWhatsapp();
          } else {
            fallo((res.datos && res.datos.error) || 'Ahora no pude responder. Si querés, seguimos por WhatsApp.');
          }
        })
        .catch(function () {
          escribiendo.remove();
          fallo('Se cortó la conexión. Probá de nuevo o seguimos por WhatsApp.');
        })
        .then(function () {
          enviando = false;
          botonEnviar.disabled = false;
          campo.focus();
        });
    }

    function abrir() {
      if (!panel.hidden) { campo.focus(); return; }
      ultimoFoco = document.activeElement;
      panel.hidden = false;
      lanzador.setAttribute('aria-expanded', 'true');
      document.body.classList.add('zai-abierto');
      bajarAlFinal();
      setTimeout(function () { campo.focus(); }, 30);
      ocultarAvisos();
      medir('zai-abrir');
    }

    function cerrar() {
      panel.hidden = true;
      lanzador.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('zai-abierto');
      if (ultimoFoco && typeof ultimoFoco.focus === 'function') ultimoFoco.focus();
    }

    lanzador.addEventListener('click', function () {
      if (panel.hidden) abrir(); else cerrar();
    });
    panel.querySelector('.zai-cerrar').addEventListener('click', cerrar);
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrar();
    });

    formulario.addEventListener('submit', function (e) {
      e.preventDefault();
      enviar(campo.value);
    });

    // Enter envía; Shift+Enter hace un salto de línea.
    campo.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        enviar(campo.value);
      }
    });
    campo.addEventListener('input', ajustarAlto);

    whatsapp.addEventListener('click', function () { medir('zai-whatsapp'); });

    // Botones del sitio que abren el chat (por ejemplo "Probá a Zai" en la
    // sección de IA). Vienen ocultos en el HTML y se muestran recién acá.
    Array.prototype.forEach.call(document.querySelectorAll('[data-zai-abrir]'), function (boton) {
      boton.hidden = false;
      boton.addEventListener('click', abrir);
    });

    pintarTodo();
  }

  estaActivo().then(function (activo) {
    if (activo) armar();
  });
})();
