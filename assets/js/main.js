(() => {
    const config = {
        totalSlides: 16,
        lerp: 0.055,
        scrollSpeed: 3.5,
        minSize: 0.1,
        growth: 0.25,
        aspect: 1 / 1.25,
        baseline: 0.015,
    };

    const slider = document.querySelector(".slider");

    if (!slider) return;

    const locations = [
        "THE QUIET EARTH",
        "WHERE LIGHT FALLS",
        "BEYOND THE HORIZON",
        "A MOMENT IN TIME",
        "INTO THE UNKNOWN",
        "THE LAST LIGHT",
        "WILD & UNTAMED",
        "SOMEWHERE ELSE",
        "AFTER THE RAIN",
        "THE ART OF STILLNESS",
    ];

    const currentElement = document.querySelector("#progress-current");
    const totalElement = document.querySelector("#progress-total");
    const progressFill = document.querySelector("#progress-fill");
    const locationElement = document.querySelector("#location-name");

    const growthRatio = Math.exp(config.growth);

    const slideCount =
        Math.ceil(
            Math.log(1 + (growthRatio - 1) / config.minSize) / config.growth,
        ) + 4;

    const lerp = (start, end, t) => start + (end - start) * t;

    const wrap = (value, max) => ((value % max) + max) % max;

    const edgeX = (position, width) => {
        const isMobile = width <= 560;
        const minSize = isMobile ? 0.16 : config.minSize;
        const growth = isMobile ? 0.18 : config.growth;
        const ratio = Math.exp(growth);

        return (
            (width * minSize * (Math.pow(ratio, position) - 1)) / (ratio - 1)
        );
    };

    const slides = [];
    const slideStreamIndex = [];

    // Build the image stream.
    for (let i = 0; i < slideCount; i++) {
        const slide = document.createElement("div");
        slide.className = "slide";

        const img = document.createElement("img");

        img.alt = "";
        img.draggable = false;
        img.decoding = "async";

        slide.appendChild(img);
        slider.appendChild(slide);

        slides.push(slide);
        slideStreamIndex.push(i);
    }

    // Load an image only when its index changes.
    function setSlideImage(slide, imageNumber) {
        if (slide.dataset.image === String(imageNumber)) {
            return;
        }

        slide.dataset.image = String(imageNumber);

        const img = slide.querySelector("img");

        img.src = `./assets/images/slide-img-${imageNumber}.jfif`;
    }

    // Preload the first few images.
    for (let i = 1; i <= Math.min(4, config.totalSlides); i++) {
        const img = new Image();
        img.src = `./assets/images/slide-img-${i}.jfif`;
    }

    let scroll = 0;
    let scrollTarget = 0;

    let pointerX = null;
    let activePointerId = null;

    let frameId = 0;
    let previousActiveIndex = -1;
    let lastWidth = 0;
    let lastHeight = 0;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    totalElement.textContent = String(config.totalSlides).padStart(2, "0");

    // Mouse wheel and trackpad.
    let wheelTarget = 0;

    slider.addEventListener(
        "wheel",
        (event) => {
            event.preventDefault();

            const delta =
                Math.abs(event.deltaX) > Math.abs(event.deltaY)
                    ? event.deltaX
                    : event.deltaY;

            wheelTarget += delta * config.scrollSpeed * 0.0014;
        },
        { passive: false },
    );

    // Unified mouse, pen, and touch dragging.
    slider.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }

        activePointerId = event.pointerId;
        pointerX = event.clientX;

        slider.classList.add("is-dragging");
        slider.setPointerCapture(event.pointerId);
    });

    slider.addEventListener("pointermove", (event) => {
        if (pointerX === null || event.pointerId !== activePointerId) {
            return;
        }

        const delta = event.clientX - pointerX;

        scrollTarget -= delta * config.scrollSpeed * 0.005;

        pointerX = event.clientX;
    });

    function releasePointer(event) {
        if (activePointerId !== null && event.pointerId !== activePointerId) {
            return;
        }

        pointerX = null;
        activePointerId = null;

        slider.classList.remove("is-dragging");
    }

    slider.addEventListener("pointerup", releasePointer);
    slider.addEventListener("pointercancel", releasePointer);
    slider.addEventListener("lostpointercapture", releasePointer);

    // Keyboard navigation.
    slider.tabIndex = 0;

    slider.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollTarget += 1;
        }

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollTarget -= 1;
        }
    });

    // Update the editorial interface.
    function updateInterface() {
        const activeIndex = wrap(Math.floor(scroll), config.totalSlides);

        if (activeIndex === previousActiveIndex) return;

        previousActiveIndex = activeIndex;

        const displayIndex = activeIndex + 1;

        currentElement.textContent = String(displayIndex).padStart(2, "0");

        locationElement.textContent = locations[activeIndex];

        progressFill.style.width = `${(displayIndex / config.totalSlides) * 100}%`;
    }

    // Render every frame.
    function render() {
        const sliderWidth = slider.clientWidth;
        const sliderHeight = slider.clientHeight;

        if (!sliderWidth || !sliderHeight) {
            frameId = requestAnimationFrame(render);
            return;
        }

        // Reinitialize layout when the viewport changes.
        if (sliderWidth !== lastWidth || sliderHeight !== lastHeight) {
            lastWidth = sliderWidth;
            lastHeight = sliderHeight;
        }

        const easing = reducedMotion.matches ? 1 : config.lerp;

        scrollTarget += wheelTarget;
        wheelTarget = 0;

        scroll = lerp(scroll, scrollTarget, easing);

        // Avoid endless tiny easing updates.
        if (Math.abs(scrollTarget - scroll) < 0.00001) {
            scroll = scrollTarget;
        }

        const isMobile = sliderWidth <= 560;

        const baselineOffset = isMobile
            ? sliderHeight * 0.12
            : sliderHeight * config.baseline;

        for (let i = 0; i < slideCount; i++) {
            const slide = slides[i];

            let streamIndex = slideStreamIndex[i];

            // Recycle slides outside the visible stream.
            while (edgeX(streamIndex + scroll, sliderWidth) > sliderWidth) {
                streamIndex -= slideCount;
            }

            while (edgeX(streamIndex + scroll + 1, sliderWidth) < 0) {
                streamIndex += slideCount;
            }

            slideStreamIndex[i] = streamIndex;

            const left = edgeX(streamIndex + scroll, sliderWidth);
            const right = edgeX(streamIndex + scroll + 1, sliderWidth);

            const width = right - left;
            const height = width / (sliderWidth <= 560 ? 0.48 : config.aspect);

            if (width <= 0) continue;

            const imageNumber = wrap(streamIndex, config.totalSlides) + 1;

            setSlideImage(slide, imageNumber);

            slide.style.width = `${width}px`;
            slide.style.height = `${height}px`;
            slide.style.zIndex = 1;

            slide.style.transform = `translate3d(${left}px, ${-baselineOffset}px, 0)`;
        }

        updateInterface();

        frameId = requestAnimationFrame(render);
    }

    // Keep the animation lifecycle tidy.
    document.addEventListener("visibilitychange", () => {
        cancelAnimationFrame(frameId);

        if (!document.hidden) {
            frameId = requestAnimationFrame(render);
        }
    });

    render();
})();
