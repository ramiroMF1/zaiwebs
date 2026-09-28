(function () {
  'use strict';

  /* ============================================================
     ZAIWEBS — Landings por rubro
     ------------------------------------------------------------
     Va además de main.js, que ya se ocupa de la cabecera, los reveal, la
     cinta de clientes, los resplandores y el acordeón. Acá están solo las
     tres cosas propias de una landing:

       1. La demo del hero que se escribe sola.
       2. La barra de WhatsApp fija en celular.
       3. El formulario que abre WhatsApp con el rubro ya escrito.

     El formulario usa data-lp-form y no data-wa-form a propósito: con el
     atributo de la home, main.js también lo engancharía y se abrirían dos
     pestañas de WhatsApp.
     ============================================================ */

  var TELEFONO = '5492923677208';
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function medir(evento, datos) {
    if (typeof umami !== 'undefined' && umami && typeof umami.track === 'function') {
      try { umami.track(evento, datos); } catch (e) { /* que nunca frene nada */ }
    }
  }

  /* ============ 1. Demo que se escribe sola ============
     Los mensajes ya están en el HTML y landing.css los oculta. Acá se
     muestran de a uno; antes de cada respuesta del asistente aparece el
     "escribiendo…", que es lo que hace que se lea como una charla y no
     como una lista que se desvanece.

     Con "reducir movimiento" se muestra todo de una. Ver el rescate por CSS
     en landing.css para el caso de que este archivo ni siquiera cargue. */
  var demos = document.querySelectorAll('[data-anima]');

  Array.prototype.forEach.call(demos, function (demo) {
    var pasos = [].slice.call(demo.querySelectorAll('[data-paso]'));
    if (!pasos.length) return;

    if (quieto) {
      pasos.forEach(function (p) { p.classList.add('is-dicho'); });
      demo.setAttribute('data-anima', 'listo');
      return;
    }

    demo.setAttribute('data-anima', 'corriendo');

    var escribiendo = null;
    if (demo.querySelector('.chat-msg--asistente')) {
      escribiendo = document.createElement('li');
      escribiendo.className = 'chat-escribiendo';
      escribiendo.setAttribute('aria-hidden', 'true');
      escribiendo.innerHTML = '<span></span><span></span><span></span>';
      pasos[0].parentNode.appendChild(escribiendo);
    }

    var i = 0;

    function siguiente() {
      if (i >= pasos.length) {
        if (escribiendo) escribiendo.parentNode.removeChild(escribiendo);
        demo.setAttribute('data-anima', 'listo');
        return;
      }

      var paso = pasos[i++];

      if (escribiendo && paso.classList.contains('chat-msg--asistente')) {
        // offsetTop contra la lista (position:relative en landing.css): el
        // globito aparece exactamente donde va a caer la respuesta.
        escribiendo.style.top = paso.offsetTop + 'px';
        escribiendo.classList.add('is-visible');
        setTimeout(function () {
          escribiendo.classList.remove('is-visible');
          paso.classList.add('is-dicho');
          setTimeout(siguiente, 1000);
        }, 1300);
      } else {
        paso.classList.add('is-dicho');
        setTimeout(siguiente, 750);
      }
    }

    // Arranca cuando la demo entra en pantalla: en escritorio es al cargar,
    // en celular recién al bajar hasta ella. Se mide en el scroll y no con
    // IntersectionObserver: en las pruebas el observador a veces no avisaba
    // nunca, y como el rescate por CSS ya está apagado mientras corre, la
    // caja quedaba vacía para siempre. El respiro de 900 ms deja entrar
    // primero el titular línea por línea.
    var empezo = false;

    function revisar() {
      if (empezo) return;
      var caja = demo.getBoundingClientRect();
      if (caja.top < window.innerHeight * 0.75 && caja.bottom > 0) {
        empezo = true;
        window.removeEventListener('scroll', revisar);
        window.removeEventListener('resize', revisar);
        setTimeout(siguiente, 900);
      }
    }

    window.addEventListener('scroll', revisar, { passive: true });
    window.addEventListener('resize', revisar);
    revisar();
  });

  /* ============ 2. Barra de WhatsApp en celular ============
     Se esconde mientras esté a la vista cualquiera de los elementos con
     data-lp-oculta-barra: los botones del hero, el contacto y el pie. Ahí ya
     hay un botón en pantalla y la barra solo taparía.

     inert además de la transformación: una barra corrida fuera de pantalla
     sigue recibiendo el foco del tabulador si no se la desactiva. */
  var barra = document.querySelector('[data-lp-barra]');

  if (barra && 'IntersectionObserver' in window) {
    var tapan = [].slice.call(document.querySelectorAll('[data-lp-oculta-barra]'));
    var enVista = tapan.map(function () { return true; });

    barra.inert = true;

    var obsBarra = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        enVista[tapan.indexOf(e.target)] = e.isIntersecting;
      });
      var mostrar = enVista.indexOf(true) === -1;
      barra.classList.toggle('is-visible', mostrar);
      barra.inert = !mostrar;
    });

    tapan.forEach(function (t) { obsBarra.observe(t); });
  }

  /* ============ 3. Formulario que abre WhatsApp ============
     Igual que el de la home, con una diferencia: el mensaje lleva el rubro
     de la landing. Así, cuando llega el WhatsApp, se sabe desde qué página
     escribió la persona sin tener que preguntarle.

     Si este script no corre, el <form> tiene action y method propios y el
     navegador abre wa.me igual, aunque sin el mensaje redactado. */
  var form = document.querySelector('[data-lp-form]');

  if (form) {
    var rubro = form.getAttribute('data-rubro') || '';
    var rubroTexto = form.getAttribute('data-rubro-texto') || '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var v = function (nombre) {
        var campo = form.elements[nombre];
        return campo ? campo.value.trim() : '';
      };

      var nombre   = v('nombre');
      var negocio  = v('negocio');
      var necesita = v('necesita');
      var detalle  = v('detalle');

      var puntoFinal = function (t) {
        return /[.!?…]$/.test(t) ? t : t + '.';
      };

      var lineas = [puntoFinal('Hola Zaiwebs, soy ' + (nombre || 'una persona interesada'))];
      if (rubroTexto) lineas.push(puntoFinal('Rubro: ' + rubroTexto));
      if (negocio)    lineas.push(puntoFinal('Mi negocio: ' + negocio));
      if (necesita)   lineas.push(puntoFinal('Necesito: ' + necesita));
      if (detalle)    lineas.push('Detalle: ' + detalle);

      var url = 'https://wa.me/' + TELEFONO + '?text=' + encodeURIComponent(lineas.join('\n\n'));

      // Solo viajan el rubro y la opción del desplegable, que son valores
      // fijos. Lo que escribe la persona no sale del navegador.
      medir('lp-formulario', { rubro: rubro, necesita: necesita || 'sin especificar' });

      window.open(url, '_blank', 'noopener');
    });
  }

})();
