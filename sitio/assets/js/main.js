(function () {
  'use strict';

  /* ============ Sello de versión ============
     Escribe en la consola qué versión de caché tiene el HTML que está
     corriendo. Existe porque ya pasó cuatro veces que el servidor quedó con
     una mezcla de archivos viejos y nuevos, y desde afuera eso se ve igual
     que un bug.

     El número sale del ?v= de este mismo archivo, o sea del HTML que lo pidió.
     Si la consola dice una versión más vieja que la última que se subió, el
     problema es la subida, no el código. */
  (function () {
    var yo = document.currentScript;
    if (!yo) {
      var todos = document.getElementsByTagName('script');
      yo = todos[todos.length - 1];
    }
    var v = (yo && yo.src || '').split('?v=')[1] || '(sin versión)';
    console.log('%cZaiwebs%c  caché v' + v, 'font-weight:700', 'color:#888');
  })();

  /* ============ Header: sombra al hacer scroll ============ */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 60) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ============ Menú móvil ============ */
  var menuToggle = document.querySelector('.menu-toggle');
  var mobileMenu = document.querySelector('.mobile-menu');
  var menuClose = document.querySelector('.mobile-menu__close');
  var body = document.body;
  var lastFocused = null;

  function getFocusable(container) {
    return Array.prototype.slice.call(
      container.querySelectorAll('a[href], button:not([disabled])')
    );
  }

  function openMenu() {
    if (!mobileMenu) return;
    lastFocused = document.activeElement;
    mobileMenu.classList.add('is-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    body.classList.add('menu-open');
    var focusable = getFocusable(mobileMenu);
    if (focusable.length) focusable[0].focus();
  }

  function closeMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    body.classList.remove('menu-open');
    if (lastFocused) lastFocused.focus();
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.contains('is-open');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    if (menuClose) {
      menuClose.addEventListener('click', closeMenu);
    }

    mobileMenu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeMenu();
        return;
      }
      if (e.key === 'Tab') {
        var focusable = getFocusable(mobileMenu);
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    Array.prototype.forEach.call(mobileMenu.querySelectorAll('a'), function (link) {
      link.addEventListener('click', closeMenu);
    });
  }


  /* Hasta el 27/09 acá estaban las solapas del hero (Web + IA, Diseño web,
     SEO, Tiendas). Se sacaron del HTML y este bloque con ellas; el código
     está en el respaldo del 27/09 si alguna vez vuelven. */


  /* ============ Scroll reveal ============
     La demora escalonada era (i % 6) × 80 ms: hasta 400 ms de espera antes
     de que empezara a moverse el último de cada tanda, que sumada a la
     animación dejaba secciones vacías un segundo al scrollear rápido. Con
     (i % 4) × 60 el escalonado se sigue viendo y el techo baja a 180 ms. */
  var revealTargets = document.querySelectorAll('[data-reveal]');
  if (revealTargets.length) {
    if ('IntersectionObserver' in window) {
      Array.prototype.forEach.call(revealTargets, function (el, i) {
        el.classList.add('reveal-init');
        el.style.transitionDelay = (i % 4) * 60 + 'ms';
      });

      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );

      Array.prototype.forEach.call(revealTargets, function (el) {
        observer.observe(el);
      });
    }
  }

  /* ============ Filtros de portfolio ============ */
  var filterButtons = document.querySelectorAll('[data-filter]');
  var portfolioCards = document.querySelectorAll('[data-category]');

  if (filterButtons.length && portfolioCards.length) {
    Array.prototype.forEach.call(filterButtons, function (btn) {
      btn.addEventListener('click', function () {
        var filter = btn.getAttribute('data-filter');

        Array.prototype.forEach.call(filterButtons, function (b) {
          b.setAttribute('aria-pressed', 'false');
        });
        btn.setAttribute('aria-pressed', 'true');

        Array.prototype.forEach.call(portfolioCards, function (card) {
          var category = card.getAttribute('data-category');
          if (filter === 'todos' || category === filter) {
            card.hidden = false;
          } else {
            card.hidden = true;
          }
        });
      });
    });
  }


  /* ============ Servicios: tarjetas que se reemplazan ============
     La sección se clava en pantalla y las tarjetas se van cambiando
     en el mismo lugar en vez de pasar de largo.

     La altura de .pin-alto se calcula acá y no en el CSS porque depende del
     alto de la ventana: media pantalla de scroll por tarjeta. Mientras esa
     altura se consume, .pin-clavado (position:sticky) se queda quieta, y de
     ese avance sale cuál tarjeta se muestra.

     Se apaga solo abajo de 900px, con movimiento reducido, o si algo falla.
     Apagado no queda a medias: vuelve a ser exactamente la lista de antes. */
  var pinAlto = document.querySelector('[data-pin-tarjetas]');
  if (pinAlto) {
    var tarjetas = [].slice.call(pinAlto.querySelectorAll('.servicio'));
    var barra    = pinAlto.querySelector('[data-pin-barra]');
    var PANTALLAS_POR_TARJETA = 0.5;
    var ANCHO_MINIMO = 900;
    var quietoPin = window.matchMedia('(prefers-reduced-motion: reduce)');
    var recorrido = 0;

    // Índice de la columna izquierda (desde el 27/09): un enlace por tarjeta,
    // en el mismo orden. El CSS solo lo muestra cuando hay pin.
    var enlacesIndice = [].slice.call(pinAlto.querySelectorAll('.servicios-indice a'));

    function marcarIndice(activa) {
      enlacesIndice.forEach(function (a, i) {
        if (i === activa) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }

    function apagarPin() {
      pinAlto.classList.remove('con-pin');
      pinAlto.style.height = '';
      tarjetas.forEach(function (t) {
        t.classList.remove('is-activa', 'ya-paso');
      });
      if (barra) barra.style.width = '';
      marcarIndice(-1);
    }

    function medirPin() {
      if (!tarjetas.length || window.innerWidth < ANCHO_MINIMO || quietoPin.matches) {
        apagarPin();
        return;
      }
      pinAlto.classList.add('con-pin');

      // El alto del header sale del CSS: si algún día cambia, esto lo sigue.
      var alturaHeader = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--header-h')
      ) || 72;
      var alturaClavada = window.innerHeight - alturaHeader;

      recorrido = tarjetas.length * PANTALLAS_POR_TARJETA * window.innerHeight;
      pinAlto.style.height = (alturaClavada + recorrido) + 'px';
      pintarPin();
    }

    function pintarPin() {
      if (!pinAlto.classList.contains('con-pin') || !recorrido) return;

      var alturaHeader = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--header-h')
      ) || 72;
      var tope = pinAlto.getBoundingClientRect().top;

      // 0 cuando la sección recién se clava, 1 cuando se consumió el recorrido.
      var avance = (alturaHeader - tope) / recorrido;
      if (avance < 0) avance = 0;
      if (avance > 1) avance = 1;

      var activa = Math.floor(avance * tarjetas.length);
      if (activa > tarjetas.length - 1) activa = tarjetas.length - 1;

      tarjetas.forEach(function (t, i) {
        t.classList.toggle('is-activa', i === activa);
        t.classList.toggle('ya-paso', i < activa);
      });

      if (barra) barra.style.width = (avance * 100).toFixed(2) + '%';
      marcarIndice(activa);
    }

    /* Clic en el índice: se scrollea hasta el MEDIO del tramo de esa tarjeta,
       no al borde. En el borde, un pixel de redondeo alcanza para que se
       muestre la de al lado. Sin pin el enlace hace lo de siempre (ancla). */
    enlacesIndice.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        if (!pinAlto.classList.contains('con-pin') || !recorrido || !tarjetas.length) return;
        e.preventDefault();
        var alturaHeader = parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--header-h')
        ) || 72;
        var inicio = pinAlto.getBoundingClientRect().top + window.scrollY - alturaHeader;
        var destino = inicio + recorrido * (i + 0.5) / tarjetas.length;
        window.scrollTo({ top: destino, behavior: quietoPin.matches ? 'auto' : 'smooth' });
      });
    });

    var pinPendiente = false;
    function alScrollear() {
      if (pinPendiente) return;
      pinPendiente = true;
      window.requestAnimationFrame(function () {
        pintarPin();
        pinPendiente = false;
      });
    }

    medirPin();
    window.addEventListener('scroll', alScrollear, { passive: true });
    window.addEventListener('load', medirPin);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirPin);
    if (quietoPin.addEventListener) quietoPin.addEventListener('change', medirPin);

    var pinTemporizador;
    window.addEventListener('resize', function () {
      clearTimeout(pinTemporizador);
      pinTemporizador = setTimeout(medirPin, 200);
    });
  }

  /* ============ Servicios: tarjetas plegables en celular ============
     Abajo de 900px las cinco tarjetas completas sumaban unos 4.300px de
     scroll. Plegadas muestran nombre y frase, y "Ver qué incluye" abre el
     resto. Arriba de 900px (donde está el pin) vuelven a estar completas.
     Solo la home: las landings tienen tres tarjetas y no las necesitan. */
  var listaServicios = document.querySelector('[data-pin-tarjetas] .servicios-lista');
  if (listaServicios) {
    var botonesAbrir = [].slice.call(listaServicios.querySelectorAll('.servicio__abrir'));
    var angosto = window.matchMedia('(max-width: 899px)');

    var detalleDe = function (boton) {
      return document.getElementById(boton.getAttribute('aria-controls'));
    };

    var aplicarPliegue = function () {
      var plegar = angosto.matches;
      listaServicios.classList.toggle('servicios-plegables', plegar);
      botonesAbrir.forEach(function (b) {
        b.hidden = !plegar;
        if (!plegar) {
          b.setAttribute('aria-expanded', 'false');
          b.firstChild.nodeValue = 'Ver qué incluye ';
          var d = detalleDe(b);
          if (d) d.classList.remove('is-abierto');
        }
      });
    };

    botonesAbrir.forEach(function (b) {
      b.addEventListener('click', function () {
        var abrir = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', String(abrir));
        // El primer hijo es el texto; el segundo, la flechita.
        b.firstChild.nodeValue = abrir ? 'Ocultar ' : 'Ver qué incluye ';
        var d = detalleDe(b);
        if (d) d.classList.toggle('is-abierto', abrir);
      });
    });

    aplicarPliegue();
    if (angosto.addEventListener) angosto.addEventListener('change', aplicarPliegue);
    else if (angosto.addListener) angosto.addListener(aplicarPliegue);
  }

  /* ============ Landing: marcar en la nav la sección visible ============
     Criterio: la última sección cuyo borde superior ya pasó la línea del
     header. Es más predecible que elegir por área visible, que hace que
     estando en el hero se resalte la sección de abajo si es más alta.

     Cuentan TODAS las secciones con id, no solo las que están en la nav.
     Antes, leyendo Testimonios o Preguntas (que no tienen enlace) seguía
     marcado "Estudio", que había quedado atrás. Ahora en esas secciones no
     se marca nada, que es lo que es cierto. */

  var enlacesNav = Array.prototype.slice.call(
    document.querySelectorAll('.site-nav__link[href^="#"], .mobile-menu__nav a[href^="#"]')
  );

  if (enlacesNav.length) {
    var refs = enlacesNav
      .map(function (a) {
        var destino = document.querySelector(a.getAttribute('href'));
        return destino ? { enlace: a, seccion: destino } : null;
      })
      .filter(Boolean);

    var seccionesConId = Array.prototype.slice.call(document.querySelectorAll('main > section[id]'));
    var pendienteNav = false;

    function marcarSeccion() {
      var header = document.querySelector('.site-header');
      var linea = (header ? header.offsetHeight : 0) + 8;
      var actual = refs.length ? refs[0].seccion : null;

      (seccionesConId.length ? seccionesConId : refs.map(function (r) { return r.seccion; }))
        .forEach(function (s) {
          if (s.getBoundingClientRect().top <= linea) actual = s;
        });

      // Al final del documento gana siempre la última
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        actual = refs[refs.length - 1].seccion;
      }

      refs.forEach(function (r) {
        var esta = r.seccion === actual;
        r.enlace.classList.toggle('is-active', esta);
        if (esta) r.enlace.setAttribute('aria-current', 'true');
        else r.enlace.removeAttribute('aria-current');
      });
    }

    window.addEventListener('scroll', function () {
      if (pendienteNav) return;
      pendienteNav = true;
      window.requestAnimationFrame(function () { marcarSeccion(); pendienteNav = false; });
    }, { passive: true });

    window.addEventListener('resize', marcarSeccion);
    // Recalcular cuando el layout ya se asentó: al cargar imágenes y fuentes.
    // Sin esto, estando en scroll 0 nunca se corrige el primer cálculo.
    window.addEventListener('load', marcarSeccion);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(marcarSeccion);
    marcarSeccion();
  }

  /* ============ Botón flotante de WhatsApp ============
     Se esconde mientras Contacto o el pie están en pantalla. En Contacto
     sobra (toda la sección ES WhatsApp) y en el pie tapaba "Términos" y
     "Política de Privacidad", que quedan justo en su esquina. */
  var waFloat = document.querySelector('.whatsapp-float');
  if (waFloat) {
    var flotanteListo = false;
    var zonasSinFlotante = Array.prototype.slice.call(document.querySelectorAll('#contacto, .site-footer'));
    var zonaALaVista = zonasSinFlotante.map(function () { return false; });

    var actualizarFlotante = function () {
      var tapa = zonaALaVista.some(Boolean);
      waFloat.classList.toggle('is-visible', flotanteListo && !tapa);
    };

    setTimeout(function () {
      flotanteListo = true;
      actualizarFlotante();
    }, 400);

    if (zonasSinFlotante.length && 'IntersectionObserver' in window) {
      // El margen de abajo hace que se vaya cuando Contacto ya ocupa una
      // parte de la pantalla, no apenas asoma su primer pixel.
      var obsFlotante = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          zonaALaVista[zonasSinFlotante.indexOf(e.target)] = e.isIntersecting;
        });
        actualizarFlotante();
      }, { rootMargin: '0px 0px -20% 0px' });
      zonasSinFlotante.forEach(function (z) { obsFlotante.observe(z); });
    }
  }

  /* ============ Selector de idioma (dropdown) ============ */
  var langBtn = document.querySelector('.lang-switch__btn');
  var langMenu = document.querySelector('.lang-switch__menu');
  if (langBtn && langMenu) {
    langBtn.addEventListener('click', function () {
      var isOpen = langMenu.style.display === 'block';
      langMenu.style.display = isOpen ? 'none' : 'block';
      langBtn.setAttribute('aria-expanded', String(!isOpen));
    });
    document.addEventListener('click', function (e) {
      if (!langBtn.contains(e.target) && !langMenu.contains(e.target)) {
        langMenu.style.display = 'none';
        langBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }
  /* ============ Cinta de clientes (loop infinito) ============
     El HTML trae UNA sola tanda de logos. Acá se clona hasta que la cinta
     mide más del doble que la pantalla, que es la condición para que el loop
     no muestre huecos: la animación corre el ancho de una tanda, y lo que
     queda a la derecha tiene que seguir tapando toda la pantalla.

     Se clona por JS y no en el HTML porque las copias tienen que quedar
     idénticas: si alguien agrega un logo en una tanda y se olvida de otra,
     el loop pega un salto en cada vuelta. Con una sola fuente eso no puede
     pasar. Y como la cantidad depende del ancho de pantalla, tampoco hay un
     número fijo que sirva para todos.

     La duración se calcula, no se fija: la animación recorre el ancho de una
     tanda, y ese ancho cambia con la pantalla (los logos usan clamp con vw).
     Con un valor fijo, la cinta iría más rápido en pantallas chicas. */
  var cinta = document.querySelector('.clientes-cinta');
  if (cinta) {
    var VELOCIDAD = 42;   // píxeles por segundo
    var quietud = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* Botón de pausa (WCAG 2.2.2: lo que se mueve solo más de 5 segundos se
       tiene que poder parar). Se crea una vez, la primera vez que la cinta
       arranca, y se esconde si la cinta queda quieta. El rótulo no cambia:
       aria-pressed ya dice si está pausada. La pausa sobrevive a los
       rearmados por resize porque vive en una clase aparte (.cinta-pausada). */
    var ICONO_PAUSA = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="1.5" width="2.8" height="9" rx="0.6"/><rect x="7.2" y="1.5" width="2.8" height="9" rx="0.6"/></svg>';
    var ICONO_SEGUIR = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.8v8.4c0 .5.5.8.9.5l6.5-4.2c.4-.2.4-.8 0-1L3.9 1.3c-.4-.3-.9 0-.9.5z"/></svg>';
    var botonPausa = null;

    function mostrarBotonPausa(mostrar) {
      if (!mostrar) {
        if (botonPausa) botonPausa.hidden = true;
        return;
      }
      if (!botonPausa) {
        var seccionCinta = cinta.closest ? cinta.closest('.clientes') : null;
        if (!seccionCinta) return;
        botonPausa = document.createElement('button');
        botonPausa.type = 'button';
        botonPausa.className = 'cinta-pausa';
        botonPausa.setAttribute('aria-label', 'Pausar la cinta de clientes');
        botonPausa.setAttribute('aria-pressed', 'false');
        botonPausa.innerHTML = ICONO_PAUSA;
        botonPausa.addEventListener('click', function () {
          var pausada = cinta.classList.toggle('cinta-pausada');
          botonPausa.setAttribute('aria-pressed', String(pausada));
          botonPausa.innerHTML = pausada ? ICONO_SEGUIR : ICONO_PAUSA;
        });
        seccionCinta.appendChild(botonPausa);
      }
      botonPausa.hidden = false;
    }

    function armarCinta() {
      var original = cinta.querySelector('.clientes-tanda');
      if (!original) return;

      // Se vuelve al estado limpio antes de recalcular: si no, cada resize
      // apilaría copias sobre las copias anteriores.
      var copias = cinta.querySelectorAll('.clientes-tanda[aria-hidden="true"]');
      for (var i = 0; i < copias.length; i++) copias[i].remove();
      cinta.classList.remove('cinta-lista');
      cinta.style.animation = '';

      if (quietud.matches) {         // sin movimiento: queda la grilla quieta
        mostrarBotonPausa(false);
        return;
      }

      /* La tanda se mide DESPUÉS de poner .cinta-lista, no antes. En el estado
         base la tanda envuelve y no pasa del ancho de pantalla, así que en un
         celular medía 551px cuando desplegada son 691. Con ese número la
         duración salía corta y la cinta corría a 75px/s en vez de 42.
         Se apaga la animación mientras tanto para que no se vea un tirón con
         los valores viejos entre que se agrega la clase y se calculan los
         nuevos. */
      cinta.style.animation = 'none';
      cinta.classList.add('cinta-lista');

      var anchoTanda = original.getBoundingClientRect().width;
      if (!anchoTanda) {
        cinta.classList.remove('cinta-lista');
        cinta.style.animation = '';
        mostrarBotonPausa(false);
        return;
      }

      var necesarias = Math.ceil((window.innerWidth * 2) / anchoTanda) + 1;
      if (necesarias < 2) necesarias = 2;

      for (var j = 1; j < necesarias; j++) {
        var copia = original.cloneNode(true);
        copia.setAttribute('aria-hidden', 'true');
        // Los lectores de pantalla ya leyeron la tanda original; las copias
        // no tienen que volver a nombrar los mismos siete clientes.
        var imgs = copia.querySelectorAll('img');
        for (var k = 0; k < imgs.length; k++) imgs[k].alt = '';
        cinta.appendChild(copia);
      }

      cinta.style.setProperty('--tandas', String(necesarias));
      cinta.style.setProperty('--dur-cinta', (anchoTanda / VELOCIDAD).toFixed(2) + 's');
      cinta.style.animation = '';   // devuelve el control al CSS, ya con los valores buenos
      mostrarBotonPausa(true);
    }

    // Las fuentes cambian el ancho de la tanda al cargar, así que se rearma
    // cuando terminan. Sin esto la cinta queda calculada con la fuente de
    // reserva y el calce se corre unos píxeles.
    armarCinta();
    window.addEventListener('load', armarCinta);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(armarCinta);
    if (quietud.addEventListener) quietud.addEventListener('change', armarCinta);

    var temporizador;
    window.addEventListener('resize', function () {
      clearTimeout(temporizador);
      temporizador = setTimeout(armarCinta, 200);
    });
  }

  /* ============ Resplandores de fondo ============
     Solo se animan mientras su sección está en pantalla. Son elementos
     grandes con blur: dejarlos animando fuera de vista le cuesta trabajo al
     navegador todo el tiempo, y eso se nota al scrollear en un celular.

     El margen del observador es generoso a propósito: la animación arranca
     antes de que la sección entre, así nadie ve el resplandor quieto y
     después moviéndose de golpe. */
  var glows = document.querySelectorAll('.fondo-glow');
  if (glows.length && 'IntersectionObserver' in window) {
    var quietoGlow = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!quietoGlow.matches) {
      var obsGlow = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          e.target.classList.toggle('glow-activo', e.isIntersecting);
        });
      }, { rootMargin: '25% 0px 25% 0px' });
      Array.prototype.forEach.call(glows, function (g) { obsGlow.observe(g); });
    }
  }

  /* ============ Formulario que abre WhatsApp ============
     No hay servidor que reciba nada: el formulario arma un mensaje con lo
     que la persona escribió y abre wa.me con ese texto ya cargado. Después
     lo manda ella, desde su propio WhatsApp.

     Si este script no corre, el <form> tiene action y method propios y el
     navegador hace un GET a wa.me igual. El mensaje no sale redactado, pero
     el chat se abre: es preferible a un botón muerto. */
  var formWA = document.querySelector('[data-wa-form]');
  if (formWA) {
    var TELEFONO = '5492923677208';

    formWA.addEventListener('submit', function (e) {
      e.preventDefault();

      var v = function (nombre) {
        var campo = formWA.elements[nombre];
        return campo ? campo.value.trim() : '';
      };

      var nombre  = v('nombre');
      var negocio = v('negocio');
      var necesita = v('necesita');
      var detalle = v('detalle');

      // Cierra con punto salvo que el texto ya termine en signo. Sin esto
      // un negocio llamado "Sofía & Cía." salía como "Sofía & Cía..".
      var puntoFinal = function (t) {
        return /[.!?…]$/.test(t) ? t : t + '.';
      };

      var lineas = [puntoFinal('Hola Zaiwebs, soy ' + (nombre || 'una persona interesada'))];
      if (negocio)  lineas.push(puntoFinal('Mi negocio: ' + negocio));
      if (necesita) lineas.push(puntoFinal('Necesito: ' + necesita));
      if (detalle)  lineas.push('Detalle: ' + detalle);

      // Doble salto de línea entre frases: WhatsApp respeta los saltos y el
      // mensaje llega legible en vez de como un párrafo corrido.
      var texto = lineas.join('\n\n');

      var url = 'https://wa.me/' + TELEFONO + '?text=' + encodeURIComponent(texto);

      /* Analítica: este es el evento más importante del sitio. El formulario
         no envía nada a ningún servidor —arma el mensaje y abre WhatsApp—,
         así que sin esta línea no queda ningún registro de las consultas que
         genera la página. Va ANTES del window.open para que el pedido salga
         mientras la pestaña todavía está activa.

         Solo viaja la opción del desplegable, que es una de las fijas y no
         identifica a nadie. El nombre, el negocio y el detalle son texto que
         escribe la persona y no salen del navegador: son datos suyos, no una
         métrica. La comprobación de typeof es para el caso de que un bloqueador
         de publicidad impida cargar el script: el formulario tiene que seguir
         funcionando igual. */
      if (typeof umami !== 'undefined' && umami && typeof umami.track === 'function') {
        try {
          umami.track('wa-formulario', { necesita: necesita || 'sin especificar' });
        } catch (err) { /* que nunca frene el envío */ }
      }

      // noopener además de _blank: sin eso la pestaña nueva puede tocar la
      // que la abrió a través de window.opener.
      window.open(url, '_blank', 'noopener');
    });
  }


  /* ============ Acordeón del FAQ ============
     El atributo name compartido entre varios <details> ya hace que abrir uno
     cierre los demás, sin una línea de JavaScript. Pero es reciente: los
     navegadores que no lo entienden lo ignoran y dejan que se abran todos.

     Esto detecta si el navegador lo soporta y solo hace el trabajo a mano
     cuando NO. En un navegador moderno este bloque no engancha nada. */
  var soportaName = 'name' in document.createElement('details');
  if (!soportaName) {
    var faq = document.querySelectorAll('.faq-item[name]');
    Array.prototype.forEach.call(faq, function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        Array.prototype.forEach.call(faq, function (otro) {
          if (otro !== d) otro.open = false;
        });
      });
    });
  }

})();
