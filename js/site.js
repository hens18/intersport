// Page UI shared by every page: header, mobile menu and footer year, plus the
// home page's chapter buttons, booking form and reviews marquee. A plain
// script with no dependencies, so it keeps working if the 3D scene can't load.
(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CONTACT = {
    phone: '(703) 574-9383',
    tel: 'tel:+17035749383',
    email: 'service@intersportperformance.com',
  };

  // ---------------------------------------------------------------- footer year
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // ---------------------------------------------------------------- header
  const nav = document.querySelector('.nav');
  const teardown = document.getElementById('teardown');
  function updateNav() {
    if (!nav) return;
    const pastHero = !teardown || scrollY > teardown.offsetTop + teardown.offsetHeight - innerHeight - 10;
    nav.classList.toggle('is-solid', pastHero || root.classList.contains('menu-open'));
  }
  addEventListener('scroll', updateNav, { passive: true });
  addEventListener('resize', updateNav);
  updateNav();

  // ---------------------------------------------------------------- mobile menu
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-menu');
  function setMenu(open, { restoreFocus = true } = {}) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    root.classList.toggle('menu-open', open);
    updateNav();
    if (open) menu.querySelector('a')?.focus();
    else if (restoreFocus && menu.contains(document.activeElement)) toggle.focus();
  }
  if (toggle && menu) {
    menu.inert = true;
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    // Links close the menu first, then go where they point.
    menu.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      e.preventDefault();
      setMenu(false, { restoreFocus: false });
      const href = a.getAttribute('href');
      const target = href.startsWith('#') && document.getElementById(href.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        history.pushState(null, '', href);
      } else {
        location.href = a.href;
      }
    });
    document.addEventListener('keydown', (e) => {
      if (!menu.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setMenu(false); return; }
      if (e.key !== 'Tab') return;
      // Keep keyboard focus inside the open menu (plus its toggle).
      const items = [toggle, ...menu.querySelectorAll('a[href], button')];
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    });
    matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  // On the home page the logo scrolls back to the top instead of reloading.
  document.querySelectorAll('a[data-home]').forEach((a) => a.addEventListener('click', (e) => {
    if (!teardown) return;
    e.preventDefault();
    setMenu(false, { restoreFocus: false });
    scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    history.replaceState(null, '', location.pathname + location.search);
  }));

  // ---------------------------------------------------------------- teardown chapters
  const panels = document.querySelectorAll('.panel');
  document.querySelectorAll('[data-scroll-stage]').forEach((el) => el.addEventListener('click', (e) => {
    if (!teardown || root.classList.contains('no-webgl')) return;
    e.preventDefault();
    const max = teardown.offsetHeight - innerHeight;
    const y = teardown.offsetTop + (+el.dataset.scrollStage / Math.max(1, panels.length - 1)) * max;
    scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
  }));

  // If the 3D module never started (old browser, blocked script, no WebGL),
  // show the chapters as a normal stacked page instead of a long empty scroll.
  addEventListener('load', () => {
    if (teardown && !root.classList.contains('has-scene')) root.classList.add('no-webgl');
  });

  // ---------------------------------------------------------------- booking form
  const form = document.getElementById('book');
  if (form) setupBookingForm(form);

  function setupBookingForm(form) {
    const alertBox = form.querySelector('.form-alert');
    const success = form.querySelector('.form-success');
    const submit = form.querySelector('[type="submit"]');
    const submitLabel = submit.textContent;
    const field = (name) => form.elements[name];

    // Earliest bookable day is today.
    const today = new Date();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    field('date').min = iso(today);

    const rules = {
      name: (v) => (v ? '' : 'Enter your name.'),
      phone: (v) => {
        const digits = v.replace(/\D/g, '');
        if (!digits) return 'Enter a phone number so we can confirm your appointment.';
        if (digits.length < 10 || digits.length > 15) return 'Enter a full phone number, including the area code.';
        return '';
      },
      email: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter an email address like name@example.com, or leave it blank.'),
      vehicle: (v) => (v ? '' : 'Enter the year, make and model of your car.'),
      date: (v) => {
        if (!v) return '';
        const [y, m, d] = v.split('-').map(Number);
        const day = new Date(y, m - 1, d);
        if (day < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return 'Choose today or a later date.';
        if (day.getDay() === 0) return 'We’re closed on Sundays. Choose another day, or use the key drop box.';
        return '';
      },
    };

    function check(name) {
      const el = field(name);
      const msg = rules[name](el.value.trim());
      const err = form.querySelector(`#err-${name}`);
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      err.textContent = msg;
      err.hidden = !msg;
      return !msg;
    }
    // After a field has shown an error, re-check it as the visitor types.
    for (const name of Object.keys(rules)) {
      const el = field(name);
      el.addEventListener('blur', () => { if (el.value.trim() || el.getAttribute('aria-invalid') === 'true') check(name); });
      el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') check(name); });
    }

    function showAlert(parts) {
      alertBox.replaceChildren(...parts.map((p) => (typeof p === 'string' ? document.createTextNode(p) : p)));
      alertBox.hidden = false;
    }
    const link = (href, text) => Object.assign(document.createElement('a'), { href, textContent: text });

    function showSuccess(kind, data) {
      const first = data.name.split(/\s+/)[0];
      const title = success.querySelector('.form-success-title');
      const body = success.querySelector('.form-success-body');
      if (kind === 'sent') {
        title.textContent = `Thanks, ${first}. Your request is in.`;
        body.replaceChildren(`A service advisor will contact you at ${data.phone} to confirm a time for your ${data.vehicle}. Need us sooner? Call `,
          link(CONTACT.tel, CONTACT.phone), '.');
      } else {
        title.textContent = 'Almost done: press send in your email app.';
        body.replaceChildren('We opened a new email with your request filled in. Send it to finish booking. If no email opened, write to ',
          link(`mailto:${CONTACT.email}`, CONTACT.email), ' or call ', link(CONTACT.tel, CONTACT.phone), '.');
      }
      form.classList.add('is-done');
      success.hidden = false;
      success.focus();
    }

    success.querySelector('[data-book-again]').addEventListener('click', () => {
      form.reset();
      form.classList.remove('is-done');
      success.hidden = true;
      alertBox.hidden = true;
      field('name').focus();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.hidden = true;
      const bad = Object.keys(rules).filter((name) => !check(name));
      if (bad.length) {
        showAlert([bad.length === 1 ? 'Please fix the highlighted field.' : `Please fix the ${bad.length} highlighted fields.`]);
        field(bad[0]).focus();
        return;
      }
      const data = Object.fromEntries(new FormData(form));
      for (const k of Object.keys(data)) if (typeof data[k] === 'string') data[k] = data[k].trim();
      // Bots fill the hidden "_gotcha" field; quietly accept and drop those.
      if (data._gotcha) { showSuccess('sent', data); return; }

      const endpoint = form.dataset.endpoint;
      if (!endpoint) {
        // No form service connected yet: hand the request to the visitor's email app.
        const body = [
          `Name: ${data.name}`, `Phone: ${data.phone}`, `Email: ${data.email || '-'}`,
          `Vehicle: ${data.vehicle}`, `Service: ${data.service}`, `Preferred date: ${data.date || 'Flexible'}`,
          `Pick-up & delivery: ${data.pickup ? 'Yes' : 'No'}`, '', data.notes || '',
        ].join('\n');
        location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(`Service request: ${data.vehicle}`)}&body=${encodeURIComponent(body)}`;
        showSuccess('email', data);
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Sending…';
      try {
        const res = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showSuccess('sent', data);
      } catch (err) {
        showAlert(['We couldn’t send your request just now. Please try again in a minute, or call ',
          link(CONTACT.tel, CONTACT.phone), ' and we’ll book you in over the phone.']);
      } finally {
        submit.disabled = false;
        submit.textContent = submitLabel;
      }
    });
  }

  // ---------------------------------------------------------------- reviews marquee
  // Repeat the cards until one half of the track is wider than the screen, then
  // duplicate that half so the CSS -50% loop is seamless. Copies are hidden from
  // assistive tech so each review is read once.
  const track = document.querySelector('[data-marquee] .marquee-track');
  if (track && !reduceMotion) {
    const originals = [...track.children];
    const addCopies = (items) => items.forEach((el) => {
      const c = el.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      track.appendChild(c);
    });
    for (let i = 0; i < 12 && track.scrollWidth < Math.max(innerWidth, 1024) * 1.2; i++) addCopies(originals);
    addCopies([...track.children]);
    // Constant speed (~45px/s) whatever the number of cards.
    track.style.setProperty('--marquee-duration', `${track.scrollWidth / 2 / 45}s`);
    track.classList.add('is-running');
  }
})();
