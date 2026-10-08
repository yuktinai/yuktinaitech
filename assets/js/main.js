const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const yearNode = document.querySelector("#year");

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll("[data-sdk-tabs]").forEach((tabsRoot) => {
  const tabs = Array.from(tabsRoot.querySelectorAll("[data-sdk-tab]"));
  const panels = Array.from(tabsRoot.querySelectorAll("[data-sdk-panel]"));

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const selected = tab.getAttribute("data-sdk-tab");

      tabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });

      panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.getAttribute("data-sdk-panel") === selected);
      });
    });
  });
});
