/* =========================================================
   NOVA — storefront interactions
   ========================================================= */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        /* ---------------- refs ---------------- */
        const header = document.getElementById('site-header');
        const nav = document.getElementById('primary-nav');
        const navToggle = document.getElementById('nav-toggle');
        const searchForm = document.getElementById('search-form');
        const searchInput = document.getElementById('search-input');
        const searchToggle = document.getElementById('search-toggle');

        const grid = document.getElementById('product-grid');
        const noResults = document.getElementById('no-results');
        const clearSearchBtn = document.getElementById('clear-search');
        const searchResult = document.getElementById('search-result');

        const cartToggle = document.getElementById('cart-toggle');
        const cartClose = document.getElementById('cart-close');
        const cartContinue = document.getElementById('cart-continue');
        const drawer = document.getElementById('cart-drawer');
        const overlay = document.getElementById('overlay');
        const itemsEl = document.getElementById('cart-items');
        const emptyEl = document.getElementById('cart-empty');
        const badge = document.getElementById('cart-badge');
        const countEl = document.getElementById('cart-count');
        const subtotalEl = document.getElementById('cart-subtotal');
        const totalEl = document.getElementById('cart-total');
        const checkoutBtn = document.getElementById('checkout-btn');
        const toast = document.getElementById('toast');

        const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

        /* ---------------- cart state ---------------- */
        const cart = [];
        let lastFocused = null;
        let toastTimer = null;
        let addedTimer = null;

        function findItem(id) {
            return cart.find(function (item) { return item.id === id; });
        }

        function cartCount() {
            return cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
        }

        function cartTotal() {
            return cart.reduce(function (sum, item) { return sum + item.qty * item.price; }, 0);
        }

        function addToCart(product) {
            const existing = findItem(product.id);
            if (existing) {
                existing.qty += 1;
            } else {
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    qty: 1
                });
            }
            renderCart(true);
        }

        function changeQty(id, delta) {
            const item = findItem(id);
            if (!item) return;
            item.qty += delta;
            if (item.qty <= 0) {
                removeFromCart(id);
                return;
            }
            renderCart();
        }

        function removeFromCart(id) {
            const index = cart.findIndex(function (item) { return item.id === id; });
            if (index === -1) return;
            cart.splice(index, 1);
            renderCart();
            showToast('Item removed from cart');
        }

        /* ---------------- rendering ---------------- */
        function buildCartItem(item) {
            const li = document.createElement('li');
            li.className = 'cart-item';
            li.dataset.id = item.id;

            const img = document.createElement('img');
            img.className = 'cart-item-img';
            img.src = item.image;
            img.alt = '';
            img.width = 72;
            img.height = 72;

            const info = document.createElement('div');
            info.className = 'cart-item-info';

            const top = document.createElement('div');
            top.className = 'cart-item-top';

            const name = document.createElement('h3');
            name.className = 'cart-item-name';
            name.textContent = item.name;

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'cart-item-remove';
            remove.dataset.action = 'remove';
            remove.textContent = 'Remove';
            remove.setAttribute('aria-label', 'Remove ' + item.name + ' from cart');

            top.appendChild(name);
            top.appendChild(remove);

            const meta = document.createElement('div');
            meta.className = 'cart-item-meta';

            const qty = document.createElement('div');
            qty.className = 'qty';
            qty.setAttribute('aria-label', 'Quantity of ' + item.name);

            const minus = document.createElement('button');
            minus.type = 'button';
            minus.className = 'qty-btn';
            minus.dataset.action = 'decrease';
            minus.textContent = '−';
            minus.setAttribute('aria-label', 'Decrease quantity of ' + item.name);

            const value = document.createElement('span');
            value.className = 'qty-value';
            value.textContent = String(item.qty);
            value.setAttribute('aria-live', 'polite');

            const plus = document.createElement('button');
            plus.type = 'button';
            plus.className = 'qty-btn';
            plus.dataset.action = 'increase';
            plus.textContent = '+';
            plus.setAttribute('aria-label', 'Increase quantity of ' + item.name);

            qty.appendChild(minus);
            qty.appendChild(value);
            qty.appendChild(plus);

            const price = document.createElement('span');
            price.className = 'cart-item-price';
            price.textContent = money.format(item.price * item.qty);

            meta.appendChild(qty);
            meta.appendChild(price);

            info.appendChild(top);
            info.appendChild(meta);

            li.appendChild(img);
            li.appendChild(info);
            return li;
        }

        function renderCart(bumpBadge) {
            itemsEl.textContent = '';

            cart.forEach(function (item) {
                itemsEl.appendChild(buildCartItem(item));
            });

            const isEmpty = cart.length === 0;
            emptyEl.classList.toggle('is-visible', isEmpty);
            itemsEl.hidden = isEmpty;

            const count = cartCount();
            const total = cartTotal();

            badge.textContent = String(count);
            countEl.textContent = '(' + count + ')';
            subtotalEl.textContent = money.format(total);
            totalEl.textContent = money.format(total);
            checkoutBtn.disabled = isEmpty;

            if (bumpBadge) {
                badge.classList.add('is-bump');
                window.setTimeout(function () { badge.classList.remove('is-bump'); }, 220);
            }
        }

        /* ---------------- drawer ---------------- */
        function openCart() {
            lastFocused = document.activeElement;
            overlay.hidden = false;
            void overlay.offsetWidth; /* flush styles so the fade-in transitions */
            drawer.classList.add('is-open');
            overlay.classList.add('is-open');
            drawer.setAttribute('aria-hidden', 'false');
            drawer.removeAttribute('inert');
            cartToggle.setAttribute('aria-expanded', 'true');
            document.body.classList.add('no-scroll');
            cartClose.focus();
        }

        function closeCart() {
            drawer.classList.remove('is-open');
            overlay.classList.remove('is-open');
            drawer.setAttribute('aria-hidden', 'true');
            drawer.setAttribute('inert', '');
            cartToggle.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('no-scroll');
            window.setTimeout(function () {
                if (!drawer.classList.contains('is-open')) overlay.hidden = true;
            }, 340);
            if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
        }

        function isCartOpen() {
            return drawer.classList.contains('is-open');
        }

        /* ---------------- toast ---------------- */
        function showToast(message) {
            toast.textContent = message;
            toast.classList.add('is-visible');
            window.clearTimeout(toastTimer);
            toastTimer = window.setTimeout(function () {
                toast.classList.remove('is-visible');
            }, 2200);
        }

        /* ---------------- header ---------------- */
        function setStuckState() {
            header.classList.toggle('is-stuck', window.scrollY > 8);
        }

        function closeNav() {
            nav.classList.remove('is-open');
            navToggle.setAttribute('aria-expanded', 'false');
        }

        navToggle.addEventListener('click', function () {
            const open = nav.classList.toggle('is-open');
            navToggle.setAttribute('aria-expanded', String(open));
            if (open && searchForm.classList.contains('is-open')) toggleMobileSearch(false);
        });

        nav.addEventListener('click', function (event) {
            if (event.target.closest('a')) closeNav();
        });

        function toggleMobileSearch(force) {
            const open = typeof force === 'boolean'
                ? force
                : !searchForm.classList.contains('is-open');
            searchForm.classList.toggle('is-open', open);
            searchToggle.setAttribute('aria-expanded', String(open));
            if (open) searchInput.focus();
        }

        searchToggle.addEventListener('click', function () {
            closeNav();
            toggleMobileSearch();
        });

        window.addEventListener('scroll', setStuckState, { passive: true });
        setStuckState();

        /* ---------------- product grid ---------------- */
        grid.addEventListener('click', function (event) {
            const btn = event.target.closest('[data-action="add"]');
            if (!btn) return;

            const card = btn.closest('.product-card');
            if (!card) return;

            addToCart({
                id: card.dataset.id,
                name: card.dataset.name,
                price: parseFloat(card.dataset.price),
                image: card.querySelector('img').src
            });

            btn.textContent = 'Added ✓';
            btn.classList.add('is-added');
            window.clearTimeout(addedTimer);
            addedTimer = window.setTimeout(function () {
                btn.textContent = 'Add to Cart';
                btn.classList.remove('is-added');
            }, 1200);

            showToast(card.dataset.name + ' added to cart');
            openCart();
        });

        /* ---------------- cart interactions ---------------- */
        cartToggle.addEventListener('click', function () {
            isCartOpen() ? closeCart() : openCart();
        });
        cartClose.addEventListener('click', closeCart);
        cartContinue.addEventListener('click', closeCart);
        overlay.addEventListener('click', closeCart);

        itemsEl.addEventListener('click', function (event) {
            const btn = event.target.closest('[data-action]');
            if (!btn) return;

            const row = btn.closest('.cart-item');
            if (!row) return;

            const action = btn.dataset.action;
            if (action === 'increase') changeQty(row.dataset.id, 1);
            else if (action === 'decrease') changeQty(row.dataset.id, -1);
            else if (action === 'remove') removeFromCart(row.dataset.id);
        });

        checkoutBtn.addEventListener('click', function () {
            showToast('Checkout is disabled in this demo');
        });

        /* ---------------- search ---------------- */
        function filterProducts() {
            const query = searchInput.value.trim().toLowerCase();
            const cards = grid.querySelectorAll('.product-card');
            let visible = 0;

            cards.forEach(function (card) {
                const haystack = (
                    card.dataset.name + ' ' + card.dataset.category
                ).toLowerCase();
                const match = haystack.indexOf(query) !== -1;
                card.classList.toggle('is-hidden', !match);
                if (match) visible += 1;
            });

            noResults.hidden = visible !== 0;
            searchResult.hidden = query === '';
            searchResult.textContent = query === ''
                ? ''
                : visible + (visible === 1 ? ' product' : ' products') + ' found for “' + searchInput.value.trim() + '”';
        }

        searchForm.addEventListener('submit', function (event) {
            event.preventDefault();
            filterProducts();
            document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
        });

        searchInput.addEventListener('input', filterProducts);

        clearSearchBtn.addEventListener('click', function () {
            searchInput.value = '';
            filterProducts();
            searchInput.focus();
        });

        /* ---------------- misc ---------------- */
        document.getElementById('wishlist-btn').addEventListener('click', function () {
            showToast('Wishlist is empty — tap the heart on a product soon');
        });

        document.getElementById('newsletter-form').addEventListener('submit', function (event) {
            event.preventDefault();
            showToast('Thanks! Check your inbox for 10% off.');
            event.target.reset();
        });

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape') return;
            if (isCartOpen()) {
                closeCart();
                return;
            }
            if (nav.classList.contains('is-open')) {
                closeNav();
                navToggle.focus();
                return;
            }
            if (searchForm.classList.contains('is-open')) toggleMobileSearch(false);
        });

        renderCart();
    }
})();
