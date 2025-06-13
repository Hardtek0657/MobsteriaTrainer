function initializeEnhancedScanner() {
  // ==========1. Resource Management==========
  const resources = {
    intervals: [],
    timeouts: [],
    elements: [],
    listeners: [],
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString();
  };

  const trackedSetInterval = (fn, delay) => {
    const id = setInterval(fn, delay);
    resources.intervals.push(id);
    return id;
  };

  const trackedSetTimeout = (fn, delay) => {
    const id = setTimeout(fn, delay);
    resources.timeouts.push(id);
    return id;
  };

  const trackedAddEventListener = (element, event, fn) => {
    element.addEventListener(event, fn);
    resources.listeners.push({ element, event, fn });
  };

  const destroy = () => {
    resources.intervals.forEach(clearInterval);
    resources.timeouts.forEach(clearTimeout);
    resources.listeners.forEach(({ element, event, fn }) => {
      element.removeEventListener(event, fn);
    });
    resources.elements.forEach((el) => el.remove());
    console.log("Scanner destroyed");
  };

  const trackElement = (element) => {
    resources.elements.push(element);
    return element;
  };

  // ==========2. Configuration==========
  const CONFIG = {
    panel: {
      width: 380,
      minimizedWidth: 240,
      padding: 14,
      minimizedPadding: "12px 16px",
      borderRadius: "14px",
      shadow: "0 6px 24px rgba(0,0,0,0.2)",
      background: "linear-gradient(145deg, #2d3748, #1a202c)",
      border: "1px solid rgba(255,255,255,0.12)",
    },
    colors: {
      primary: "#48bb78",
      secondary: "#4299e1",
      warning: "#ed8936",
      danger: "#f56565",
      success: "#48bb78",
      info: "#4299e1",
      crime: "#9f7aea",
      gta: "#ed64a6",
      heist: "#f6ad55",
      text: {
        primary: "#f8fafc",
        secondary: "#e2e8f0",
        dark: "#2d3748",
      },
      ui: {
        background: "#2d3748",
        card: "#4a5568",
        highlight: "#5a67d8",
      },
    },
    stats: ["health", "stamina", "strength", "speed", "endurance", "defence"],
    defaultInterval: 1,
    apiBase: "https://api.mobsteria.com/api",
    // Important to update your auth token regularly!
    // it is used to send requests to the API
    authToken: "Bearer YOUR_AUTH_TOKEN_HERE",
    defaultCooldown: 0,
    autoCrimeInterval: 5000, // Changed to 5 seconds
    defaultCrimeId: 2,
    defaultGtaId: 1,
    defaultHeistId: 1,
    minTrainEnergy: 10,
    resourceCosts: {
      crime: { nerve: 10, focus: 0, wit: 0 },
      gta: { nerve: 0, focus: 15, wit: 0 },
      heist: { nerve: 0, focus: 0, wit: 20 },
    },
  };

  const UI_CONFIG = {
    tabs: [
      { id: "bust", label: "Bust Scanner", color: CONFIG.colors.primary },
      { id: "trainer", label: "Auto-Trainer", color: CONFIG.colors.secondary },
      { id: "crimes", label: "Crimes", color: CONFIG.colors.crime },
    ],
    inputs: {
      scanInterval: {
        type: "number",
        label: "Interval (ms)",
        min: 50,
        max: 1000,
        value: 100,
      },
      trainInterval: {
        type: "number",
        label: "Interval (minutes)",
        min: 1,
        max: 60,
        value: 1,
      },
      minEnergy: {
        type: "number",
        label: "Min Energy",
        min: 1,
        max: 100,
        value: 10,
      },
    },
  };

  // ====================3. Core Utilities (Optimized)==========
  const utils = {
    createComponent: (type, options = {}, styles = {}) => {
      const el = document.createElement(type);
      Object.assign(el, options);
      Object.assign(el.style, styles);
      return trackElement(el);
    },

    applyStyles: (element, styles) => {
      Object.assign(element.style, styles);
      return element;
    },

    updateStatus: (element, text, isActive = false, isError = false) => {
      const color = isError
        ? CONFIG.colors.danger
        : isActive
          ? CONFIG.colors.success
          : CONFIG.colors.danger;
      element.textContent = text;
      element.style.background = `${color}20`;
      element.style.color = color;
      element.style.border = `1px solid ${color}40`;
    },

    createAutoToggleHandler: (ui, statusPrefix) => (e) => {
      const isActive = e.target.checked;
      ui.statusText.textContent = `${statusPrefix}: ${isActive ? "ON" : "OFF"}`;
      this.updateStatus(ui.statusText, ui.statusText.textContent, isActive);
    },

    formatTime: (date) => date?.toLocaleTimeString() || "N/A",

    getRandomTime: (base, variance) =>
      base + (Math.random() * variance * 2 - variance),

    getColor: (type, opacity = 1) => {
      const base = CONFIG.colors[type] || CONFIG.colors.primary;
      return opacity === 1
        ? base
        : `${base}${Math.round(opacity * 255)
            .toString(16)
            .padStart(2, "0")}`;
    },

    createTrackedListener: (element, event, fn) => {
      trackedAddEventListener(element, event, fn);
      return () => element.removeEventListener(event, fn);
    },
  };

  const createComponent = utils.createComponent;
  const applyStyles = utils.applyStyles;

  // ==================== Updated API Section ==========
  const api = {
    isUpdating: false,

    async call(endpoint, method = "GET", body = null) {
      try {
        const options = {
          method,
          headers: {
            Authorization: CONFIG.authToken,
            "Content-Type": "application/json",
          },
        };

        if (method !== "GET" && body) {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(`${CONFIG.apiBase}${endpoint}`, options);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`,
          );
        }

        return await response.json();
      } catch (error) {
        console.error("API Error:", error);
        return { status: "error", message: error.message };
      }
    },

    async getCharacterUpdates() {
      try {
        loadingIndicator.style.display = "block";
        const data = await this.call("/character-updates", "GET");
        return data;
      } catch (error) {
        console.error("Character update failed:", error);
        return null;
      } finally {
        loadingIndicator.style.display = "none";
      }
    },
  };

  // ====================4. UI Components==========
  const createTabButton = (text, color) => {
    const btn = createComponent(
      "button",
      { textContent: text },
      {
        flex: "1",
        padding: "12px",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "14px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        background: "transparent",
        color: CONFIG.colors.text.secondary,
      },
    );
    btn.style.setProperty("--active-color", color);
    return btn;
  };

  const createCard = (titleText, color) => {
    const card = createComponent(
      "div",
      {},
      {
        background: CONFIG.colors.ui.card,
        borderRadius: "12px",
        padding: "12px",
        marginBottom: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        borderLeft: `4px solid ${color}`,
      },
    );

    if (titleText) {
      const title = createComponent(
        "h4",
        { textContent: titleText },
        {
          margin: "0 0 12px 0",
          color: color,
          fontSize: "16px",
          fontWeight: "600",
        },
      );
      card.prepend(title);
    }

    return card;
  };

  const INPUT_PRESETS = {
    compactNumber: {
      style: {
        width: "60px",
        padding: "4px 6px",
        fontSize: "11px",
      },
    },
    standard: {
      style: {
        width: "100%",
        padding: "8px 12px",
        fontSize: "12px",
      },
    },
  };

  const createInput = (config, preset = "standard") => {
    const container = createComponent(
      "div",
      {},
      {
        display: "flex",
        flexDirection: "column",
        marginBottom: "8px",
      },
    );

    const label = createComponent(
      "label",
      {
        textContent: config.label,
        htmlFor: config.id,
      },
      {
        fontSize: "12px",
        fontWeight: "500",
        color: CONFIG.colors.text.secondary,
        marginBottom: "4px",
      },
    );

    const input = createComponent(
      "input",
      {
        type: config.type,
        id: config.id,
        value: config.value,
        min: config.min,
        max: config.max,
      },
      {
        ...INPUT_PRESETS[preset].style,
        borderRadius: "6px",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.2)",
        color: CONFIG.colors.text.primary,
      },
    );

    container.append(label, input);
    return { container, input };
  };

  const createToggle = (id, label, initialState = false) => {
    const container = createComponent(
      "div",
      {},
      {
        display: "flex",
        alignItems: "center",
        gap: "8px",
      },
    );

    const toggle = createComponent(
      "input",
      {
        type: "checkbox",
        id,
        checked: initialState,
      },
      {
        width: "32px",
        height: "16px",
        cursor: "pointer",
        appearance: "none",
        background: initialState ? CONFIG.colors.primary : "rgba(0,0,0,0.2)",
        borderRadius: "8px",
        position: "relative",
        transition: "all 0.2s ease",
        "::after": {
          content: '""',
          position: "absolute",
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: "white",
          top: "2px",
          left: initialState ? "18px" : "2px",
          transition: "all 0.2s ease",
        },
      },
    );

    container.append(
      createComponent("label", { textContent: label, htmlFor: id }),
      toggle,
    );

    return { container, toggle };
  };

  // ==========5. Standard Tab Factory==========
  const createStandardTab = (tabId, tabConfig) => {
    const tabContent = createComponent(
      "div",
      {},
      {
        padding: "0",
        marginBottom: "0",
      },
    );

    // Settings Section
    const settingsSection = createComponent(
      "div",
      {},
      {
        padding: "12px 16px 8px 16px",
        borderBottom: `1px solid ${CONFIG.colors.ui.card}`,
      },
    );

    // Toggle Section
    const toggleSection = createComponent(
      "div",
      {},
      {
        padding: "10px 16px",
        borderBottom: `1px solid ${CONFIG.colors.ui.card}`,
        background: "rgba(0,0,0,0.1)",
        borderRadius: "8px",
        margin: "8px 0",
      },
    );

    // Status Section
    const statusSection = createComponent(
      "div",
      {},
      {
        padding: "8px 16px 12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      },
    );

    // Status Line
    const statusLine = createComponent(
      "div",
      {},
      {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      },
    );

    // Status Elements
    const statusText = createComponent(
      "span",
      {
        id: `${tabId}StatusText`,
        textContent: tabConfig.initialStatus || "Ready",
      },
      {
        fontSize: "12px",
        fontWeight: "500",
        color: CONFIG.colors.text.primary,
        padding: "4px 8px",
        borderRadius: "4px",
        background: `${tabConfig.statusColor || CONFIG.colors.success}20`,
        border: `1px solid ${tabConfig.statusColor || CONFIG.colors.success}40`,
      },
    );

    // Results Display
    const resultsDisplay = createComponent(
      "div",
      {
        id: `${tabId}ResultsDisplay`,
      },
      {
        marginTop: "8px",
        padding: "8px",
        borderRadius: "6px",
        background: "rgba(0,0,0,0.2)",
        fontSize: "11px",
        color: CONFIG.colors.text.secondary,
        maxHeight: "100px",
        overflowY: "auto",
      },
    );

    // Assemble sections
    statusLine.append(statusText);
    statusSection.append(statusLine);

    // Tab-specific additions
    if (tabId === "trainer") {
      const lastRunDisplay = createComponent(
        "div",
        {
          id: `${tabId}LastRun`,
          textContent: "Not run yet",
        },
        {
          fontSize: "11px",
          color: CONFIG.colors.text.secondary,
          textAlign: "center",
          marginTop: "2px",
        },
      );
      statusSection.appendChild(lastRunDisplay);
    } else if (tabId === "crimes") {
      const cooldownTimer = createComponent(
        "div",
        {
          id: "cooldownTimer",
          textContent: "",
        },
        {
          fontSize: "11px",
          color: CONFIG.colors.text.secondary,
          textAlign: "center",
          marginTop: "2px",
        },
      );
      statusSection.appendChild(cooldownTimer);
    }

    statusSection.appendChild(resultsDisplay);

    // Add all sections to tab
    tabContent.append(settingsSection, toggleSection, statusSection);

    return {
      content: tabContent,
      settingsSection,
      toggleSection,
      statusSection,
      statusText,
      resultsDisplay,
    };
  };

  // ====================6. Main UI Construction==========
  // Create panel
  const panel = createComponent(
    "div",
    { id: "enhancedScannerPanel" },
    {
      position: "fixed",
      bottom: "30px",
      right: "30px",
      background: CONFIG.panel.background,
      padding: CONFIG.panel.padding,
      borderRadius: CONFIG.panel.borderRadius,
      boxShadow: CONFIG.panel.shadow,
      border: CONFIG.panel.border,
      zIndex: "9999",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      width: `${CONFIG.panel.width}px`,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      color: CONFIG.colors.text.primary,
    },
  );

  // Add custom font
  const fontLink = createComponent("link", {
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
    rel: "stylesheet",
  });
  document.head.appendChild(fontLink);

  // Loading Indicator
  const loadingIndicator = createComponent(
    "div",
    {
      id: "loadingIndicator",
      textContent: "Updating...",
    },
    {
      display: "none",
      position: "absolute",
      top: "10px",
      left: "10px",
      fontSize: "12px",
      color: CONFIG.colors.info,
      background: "rgba(0,0,0,0.7)",
      padding: "4px 8px",
      borderRadius: "4px",
      zIndex: "10000",
    },
  );
  panel.appendChild(loadingIndicator);

  // Toggle Button
  const toggleButton = createComponent(
    "button",
    {
      innerHTML: "&minus;",
      title: "Minimize",
    },
    {
      position: "absolute",
      top: "10px",
      right: "10px",
      width: "32px",
      height: "32px",
      border: "none",
      borderRadius: "8px",
      background: "rgba(255,255,255,0.08)",
      color: CONFIG.colors.text.primary,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "18px",
      fontWeight: "600",
      padding: "0",
    },
  );

  // Title
  const titleContainer = createComponent(
    "div",
    {},
    {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      paddingBottom: "16px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    },
  );

  const title = createComponent(
    "h3",
    {},
    {
      margin: "0",
      color: CONFIG.colors.text.primary,
      fontSize: "20px",
      fontWeight: "600",
      letterSpacing: "0.25px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
  );

  const titleIcon = createComponent(
    "span",
    { innerHTML: "&#9881;" },
    {
      fontSize: "24px",
      color: CONFIG.colors.primary,
    },
  );

  const titleText = createComponent("span", {
    textContent: "Mobsteria MultiTool",
  });
  title.append(titleIcon, titleText);
  titleContainer.append(title, toggleButton);
  panel.appendChild(titleContainer);

  // Content Container
  const contentContainer = createComponent(
    "div",
    { id: "scannerContentContainer" },
    {
      opacity: "0",
      transform: "translateY(10px)",
      animation: "fadeIn 0.4s ease-out forwards",
    },
  );

  // Tab System
  const tabsContainer = createComponent(
    "div",
    {},
    {
      display: "flex",
      marginBottom: "20px",
      background: CONFIG.colors.ui.card,
      borderRadius: "10px",
      padding: "6px",
      gap: "6px",
    },
  );

  const tabs = {};
  UI_CONFIG.tabs.forEach(({ id, label, color }) => {
    const tab = createTabButton(label, color);
    tabs[id] = {
      tab,
      ...createStandardTab(id, {
        initialStatus: id === "bust" ? "Ready" : "INACTIVE",
        statusColor:
          id === "bust" ? CONFIG.colors.danger : CONFIG.colors.success,
      }),
    };
    trackedAddEventListener(tab, "click", () => switchTab(id));
    tabsContainer.appendChild(tab);
  });

  contentContainer.appendChild(tabsContainer);

  // CSS Animations
  const styleElement = createComponent("style");
  styleElement.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .tab-active {
            background: var(--active-color) !important;
            color: white !important;
            box-shadow: 0 2px 12px var(--active-color)80;
        }
        .tab-active:hover {
            transform: none !important;
        }
    `;
  document.head.appendChild(styleElement);

  // Tab Switching
  const switchTab = (activeTab) => {
    Object.entries(tabs).forEach(([key, { tab, content }]) => {
      content.style.display = key === activeTab ? "block" : "none";
      tab.classList.toggle("tab-active", key === activeTab);
    });
    contentContainer.style.opacity = "1";
  };

  // Initialize tabs
  Object.values(tabs).forEach(({ content }) => {
    content.style.display = "none";
    contentContainer.appendChild(content);
  });

  // ====================7. Bust Scanner Tab==========
  const bustUI = tabs.bust;

  // Scanner Controls Row
  const scannerControlsRow = createComponent(
    "div",
    {},
    {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "8px",
    },
  );

  // Scanner Toggle
  const { container: scannerToggleContainer, toggle: scannerToggle } =
    createToggle("scannerToggle", "Scanner:", false);
  scannerControlsRow.appendChild(scannerToggleContainer);

  // Interval Input
  const { container: intervalContainer, input: intervalInput } = createInput(
    {
      id: "scanIntervalInput",
      label: "Interval (ms):",
      type: "number",
      value: UI_CONFIG.inputs.scanInterval.value,
      min: UI_CONFIG.inputs.scanInterval.min,
      max: UI_CONFIG.inputs.scanInterval.max,
    },
    "compactNumber",
  );
  scannerControlsRow.appendChild(intervalContainer);

  // Add to settings section
  bustUI.settingsSection.appendChild(scannerControlsRow);

  // ==========8. Auto-Trainer Tab==========
  const trainerUI = tabs.trainer;

  // Stat Selection
  const statSelectContainer = createComponent(
    "div",
    {},
    {
      display: "flex",
      flexDirection: "column",
      marginBottom: "8px",
    },
  );

  const statLabel = createComponent(
    "label",
    {
      textContent: "Train Stat:",
      htmlFor: "trainStatSelect",
    },
    {
      fontSize: "12px",
      fontWeight: "500",
      color: CONFIG.colors.text.secondary,
      marginBottom: "4px",
    },
  );

  const statSelect = createComponent(
    "select",
    { id: "trainStatSelect" },
    {
      width: "100%",
      padding: "8px 12px",
      borderRadius: "6px",
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(0,0,0,0.2)",
      color: CONFIG.colors.text.primary,
      fontSize: "12px",
    },
  );

  CONFIG.stats.forEach((stat) => {
    statSelect.appendChild(
      createComponent("option", {
        value: stat,
        textContent: stat.charAt(0).toUpperCase() + stat.slice(1),
      }),
    );
  });

  statSelectContainer.append(statLabel, statSelect);

  // Input Row Container
  const inputRowContainer = createComponent(
    "div",
    {},
    {
      display: "flex",
      gap: "12px",
      marginBottom: "8px",
    },
  );

  // Interval Input
  const { container: trainerIntervalContainer, input: trainerIntervalInput } =
    createInput({
      id: "trainInterval",
      label: "Interval (min):",
      type: "number",
      value: UI_CONFIG.inputs.trainInterval.value,
      min: UI_CONFIG.inputs.trainInterval.min,
      max: UI_CONFIG.inputs.trainInterval.max,
    });
  applyStyles(trainerIntervalContainer, {
    flex: "1",
    marginBottom: "0",
  });

  // Energy Input
  const { container: energyContainer, input: energyInput } = createInput({
    id: "minEnergyInput",
    label: "Min Energy:",
    type: "number",
    value: UI_CONFIG.inputs.minEnergy.value,
    min: UI_CONFIG.inputs.minEnergy.min,
    max: UI_CONFIG.inputs.minEnergy.max,
  });
  applyStyles(energyContainer, {
    flex: "1",
    marginBottom: "0",
  });

  // Add inputs to row container
  inputRowContainer.append(trainerIntervalContainer, energyContainer);

  // Add to settings section
  trainerUI.settingsSection.append(statSelectContainer, inputRowContainer);

  // Auto-Trainer Toggle
  const { container: autoTrainerContainer, toggle: autoTrainerToggle } =
    createToggle("autoTrainerToggle", "Auto-Trainer:", false);
  trainerUI.toggleSection.appendChild(autoTrainerContainer);

  trackedAddEventListener(autoTrainerToggle, "change", (e) => {
    isTrainerRunning = e.target.checked;

    if (isTrainerRunning) {
      utils.updateStatus(trainerUI.statusText, "Status: ACTIVE", true);
      trainerUI.resultsDisplay.textContent = `[${getCurrentTime()}] Auto-trainer activated`;

      const stat = statSelect.value;
      const intervalMinutes =
        parseInt(trainerIntervalInput.value) || CONFIG.defaultInterval;

      // Run immediately when activated
      checkEnergyAndTrain();

      // Set up the interval
      trainerIntervalId = trackedSetInterval(
        checkEnergyAndTrain,
        intervalMinutes * 60000,
      );

      lastRun = new Date();
      nextRun = new Date(lastRun.getTime() + intervalMinutes * 60000);
      updateRunTimes();
    } else {
      utils.updateStatus(trainerUI.statusText, "Status: INACTIVE", false);
      clearInterval(trainerIntervalId);
      trainerUI.resultsDisplay.textContent = `[${getCurrentTime()}] Auto-trainer deactivated`;
      nextRun = null;
      updateRunTimes();
    }
  });

  // ==========9. Crimes Tab==========
  const crimesUI = tabs.crimes;

  // ID Inputs Grid
  const idInputsGrid = createComponent(
    "div",
    {},
    {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "10px",
      marginBottom: "8px",
    },
  );

  const createCompactIdInput = (label, id, defaultValue) => {
    const container = createComponent(
      "div",
      {},
      {
        display: "flex",
        flexDirection: "column",
      },
    );

    const labelEl = createComponent(
      "label",
      {
        textContent: label,
        htmlFor: id,
      },
      {
        fontSize: "12px",
        fontWeight: "500",
        color: CONFIG.colors.text.secondary,
        marginBottom: "4px",
      },
    );

    const input = createComponent(
      "input",
      {
        type: "number",
        id: id,
        value: defaultValue,
        min: "1",
      },
      {
        padding: "6px 8px",
        fontSize: "12px",
        width: "100%",
        borderRadius: "6px",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.2)",
        color: CONFIG.colors.text.primary,
      },
    );

    container.append(labelEl, input);
    return container;
  };

  idInputsGrid.append(
    createCompactIdInput("Crime ID", "crimeIdInput", CONFIG.defaultCrimeId),
    createCompactIdInput("GTA ID", "gtaIdInput", CONFIG.defaultGtaId),
    createCompactIdInput("Heist ID", "heistIdInput", CONFIG.defaultHeistId),
  );

  crimesUI.settingsSection.appendChild(idInputsGrid);

  // Auto-Crime Row
  const autoCrimeRow = createComponent(
    "div",
    {},
    {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "8px",
    },
  );

  const { container: autoCrimeToggleContainer, toggle: autoCrimeToggle } =
    createToggle("autoCrimeToggle", "Auto:", false);
  autoCrimeRow.appendChild(autoCrimeToggleContainer);

  // Resource Costs
  const resourceCostsContainer = createComponent(
    "div",
    {},
    {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
  );

  const createResourcePill = (type, resource, defaultValue) => {
    const pill = createComponent(
      "div",
      {},
      {
        display: "flex",
        alignItems: "center",
        gap: "4px",
      },
    );

    const label = createComponent(
      "span",
      {},
      {
        fontSize: "11px",
        color: CONFIG.colors.text.secondary,
      },
    );
    label.textContent =
      type === "crime" ? "Nerve:" : type === "gta" ? "Focus:" : "Wit:";

    const input = createComponent(
      "input",
      {
        type: "number",
        id: `${type}${resource}Cost`,
        value: defaultValue,
        min: "0",
      },
      {
        width: "40px",
        padding: "4px 6px",
        fontSize: "11px",
        borderRadius: "6px",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.2)",
        color: CONFIG.colors.text.primary,
      },
    );

    pill.append(label, input);
    return pill;
  };

  resourceCostsContainer.append(
    createResourcePill("crime", "nerve", CONFIG.resourceCosts.crime.nerve),
    createResourcePill("gta", "focus", CONFIG.resourceCosts.gta.focus),
    createResourcePill("heist", "wit", CONFIG.resourceCosts.heist.wit),
  );

  autoCrimeRow.appendChild(resourceCostsContainer);
  crimesUI.toggleSection.appendChild(autoCrimeRow);

  // ==========10. Event Handlers==========
  // Minimize/Maximize
  let isMinimized = false;
  trackedAddEventListener(toggleButton, "click", () => {
    isMinimized = !isMinimized;
    contentContainer.style.display = isMinimized ? "none" : "block";
    panel.style.width = isMinimized
      ? `${CONFIG.panel.minimizedWidth}px`
      : `${CONFIG.panel.width}px`;
    panel.style.padding = isMinimized
      ? CONFIG.panel.minimizedPadding
      : CONFIG.panel.padding;
    toggleButton.innerHTML = isMinimized ? "+" : "&minus;";
    toggleButton.title = isMinimized ? "Maximize" : "Minimize";
  });

  // Initialize with first tab active
  switchTab("bust");

  // Add panel to document
  panel.appendChild(contentContainer);
  document.body.appendChild(panel);

  // ==========11. Functional Logic (Optimized)==========
  // Bust Scanner Logic
  let isBustRunning = false;
  let bustIntervalId;

  const checkForButton = () => {
    if (!isBustRunning) return;

    const buttons = Array.from(document.querySelectorAll("button"));
    const matchingButtons = buttons.filter((btn) => {
      const btnText = btn.textContent?.trim().toLowerCase();
      return ["bust", "self bust"].includes(btnText);
    });

    if (matchingButtons.length) {
      const logMessage = `[${getCurrentTime()}] Found ${matchingButtons.length} matching buttons: ${matchingButtons.map((btn) => `"${btn.textContent.trim()}"`).join(", ")}`;
      bustUI.resultsDisplay.textContent = logMessage;
    }

    const targetButton =
      matchingButtons.find((btn) =>
        btn.classList.contains("shadow-deep-green"),
      ) ||
      matchingButtons.find((btn) =>
        btn.classList.contains("shadow-deep-yellow"),
      ) ||
      matchingButtons[0];

    if (targetButton) {
      const actionMessage = `[${getCurrentTime()}] Clicking: "${targetButton.textContent.trim()}"`;
      bustUI.resultsDisplay.textContent = actionMessage;
      targetButton.click();

      const delay = utils.getRandomTime(300, 50);
      const delayMessage = `[${getCurrentTime()}] Pausing for ${Math.round(delay / 10) / 100}s...`;
      bustUI.resultsDisplay.textContent = delayMessage;

      trackedSetTimeout(() => {
        if (isBustRunning) {
          const baseInterval = parseInt(intervalInput.value) || 100;
          const randomizedInterval = utils.getRandomTime(baseInterval, 50);
          bustIntervalId = trackedSetInterval(
            checkForButton,
            randomizedInterval,
          );
          const resumeMessage = `[${getCurrentTime()}] Resuming scan (next check in ~${Math.round(randomizedInterval / 10) / 100}s)`;
          bustUI.resultsDisplay.textContent = resumeMessage;
        }
      }, delay);
    } else {
      const noMatchMessage = `[${getCurrentTime()}] No buttons found (looking for: Bust, Self Bust)`;
      bustUI.resultsDisplay.textContent = noMatchMessage;
    }
  };

  trackedAddEventListener(scannerToggle, "change", (e) => {
    isBustRunning = e.target.checked;

    if (isBustRunning) {
      utils.updateStatus(bustUI.statusText, "Scanning", true);
      bustUI.resultsDisplay.textContent = `[${getCurrentTime()}] Bust scanner activated`;

      const baseInterval = parseInt(intervalInput.value) || 100;
      const randomizedInterval = utils.getRandomTime(baseInterval, 50);
      bustIntervalId = trackedSetInterval(checkForButton, randomizedInterval);
      bustUI.resultsDisplay.textContent = `[${getCurrentTime()}] Starting scan (randomized interval: ~${Math.round(randomizedInterval / 10) / 100}s)`;
    } else {
      utils.updateStatus(bustUI.statusText, "Ready");
      clearInterval(bustIntervalId);
      bustUI.resultsDisplay.textContent = `[${getCurrentTime()}] Bust scanner deactivated`;
    }
  });

  // Auto-Trainer Logic
  let isTrainerRunning = false;
  let trainerIntervalId;
  let lastRun = null;
  let nextRun = null;
  let currentEnergy = 0;

  const updateRunTimes = () => {
    if (lastRun) {
      trainerUI.statusSection.querySelector("#trainerLastRun").textContent =
        `Last run: ${utils.formatTime(lastRun)}`;
    }
    if (nextRun) {
      trainerUI.statusSection.querySelector("#trainerLastRun").textContent +=
        ` | Next run: ${utils.formatTime(nextRun)}`;
    }
  };

  const checkEnergyAndTrain = async () => {
    if (!isTrainerRunning) return;

    try {
      // Force update when checking for training
      const characterData = await api.getCharacterUpdates();
      if (!characterData) {
        trainerUI.resultsDisplay.textContent = `[${getCurrentTime()}] Failed to fetch character updates`;
        return;
      }

      const minEnergy = parseInt(energyInput.value) || CONFIG.minTrainEnergy;
      currentEnergy = parseFloat(
        characterData?.resources?.energy?.current || 0,
      );

      if (currentEnergy < minEnergy) {
        trainerUI.resultsDisplay.textContent = `[${getCurrentTime()}] Waiting for energy (${currentEnergy}/${minEnergy})`;
        return;
      }

      const stat = statSelect.value;
      trainerUI.resultsDisplay.textContent = `[${getCurrentTime()}] Training ${stat}...`;

      const data = await api.call("/fight-club/train", "POST", { stat });
      if (data.status === "error") {
        throw new Error(data.message);
      }

      const resultMessage = `[${getCurrentTime()}] Trained ${stat} successfully!\nEnergy used: ${data.energy_cost || "N/A"}\nExp gained: ${data.exp_gained || "N/A"}`;
      trainerUI.resultsDisplay.textContent = resultMessage;

      lastRun = new Date();
      const intervalMinutes =
        parseInt(trainerIntervalInput.value) || CONFIG.defaultInterval;
      nextRun = new Date(lastRun.getTime() + intervalMinutes * 60000);
      updateRunTimes();
    } catch (error) {
      trainerUI.resultsDisplay.textContent = `[${getCurrentTime()}] Training failed: ${error.message}`;

      lastRun = new Date();
      nextRun = new Date(lastRun.getTime() + 60000);
      updateRunTimes();
    }
  };

  // Crimes Logic
  let isCrimeInProgress = false;
  let crimeCooldownTimeout = null;
  let currentCooldown = 0;
  let autoCrimeIntervalId;
  let isAutoCrimeRunning = false;

  const crimeOperations = {
    crime: {
      input: document.getElementById("crimeIdInput"),
      endpoint: (id) => `/crimes/${id}/commit`,
      name: "Crime",
      method: "POST",
    },
    gta: {
      input: document.getElementById("gtaIdInput"),
      endpoint: (id) => `/gtas/${id}/commit`,
      name: "GTA",
      method: "POST",
    },
    heist: {
      input: document.getElementById("heistIdInput"),
      endpoint: (id) => `/heists/${id}/start`,
      name: "Heist",
      method: "POST",
    },
  };

  const updateCooldownTimer = (seconds) => {
    if (seconds <= 0) {
      crimesUI.statusSection.querySelector("#cooldownTimer").textContent = "";
      return;
    }
    crimesUI.statusSection.querySelector("#cooldownTimer").textContent =
      `Cooldown: ${seconds}s`;
    currentCooldown = seconds;
    trackedSetTimeout(() => updateCooldownTimer(seconds - 1), 1000);
  };

  const setCrimeCooldown = (duration) => {
    isCrimeInProgress = true;
    updateCooldownTimer(duration);

    crimeCooldownTimeout = trackedSetTimeout(() => {
      isCrimeInProgress = false;
      utils.updateStatus(crimesUI.statusText, "Ready", true);
      crimesUI.statusSection.querySelector("#cooldownTimer").textContent = "";
    }, duration * 1000);
  };

  const executeCrimeOperation = async (type) => {
    if (isCrimeInProgress) {
      const message = `[${getCurrentTime()}] Wait ${currentCooldown}s before next action`;
      crimesUI.resultsDisplay.textContent = message;
      utils.updateStatus(
        crimesUI.statusText,
        `Wait ${currentCooldown}s`,
        false,
        true,
      );
      return;
    }

    const data = await api.getCharacterUpdates();
    if (!data) {
      const message = `[${getCurrentTime()}] Failed to fetch character data`;
      crimesUI.resultsDisplay.textContent = message;
      utils.updateStatus(crimesUI.statusText, "Update failed", false, true);
      return;
    }

    if (data?.jail?.isInJail) {
      const message = `[${getCurrentTime()}] Cannot commit crimes while in jail`;
      crimesUI.resultsDisplay.textContent = message;
      utils.updateStatus(crimesUI.statusText, "In jail", false, true);
      return;
    }

    const operation = crimeOperations[type];
    const id =
      operation.input.value ||
      (type === "crime"
        ? CONFIG.defaultCrimeId
        : type === "gta"
          ? CONFIG.defaultGtaId
          : CONFIG.defaultHeistId);

    crimesUI.resultsDisplay.textContent = `[${getCurrentTime()}] Attempting ${operation.name}...`;
    utils.updateStatus(crimesUI.statusText, `${operation.name}...`);

    try {
      const result = await api.call(operation.endpoint(id), operation.method);
      if (result.status === "error") {
        throw new Error(result.message);
      }

      const successMessage = `[${getCurrentTime()}] ${operation.name} successful!\nReward: $${result.reward || "0"}\nExp gained: ${result.exp_gained || "0"}`;
      crimesUI.resultsDisplay.textContent = successMessage;
      utils.updateStatus(crimesUI.statusText, `${operation.name} done`, true);

      const cooldownDuration =
        result.cooldown_remaining || CONFIG.defaultCooldown;
      setCrimeCooldown(cooldownDuration);

      return result;
    } catch (error) {
      const errorMessage = `[${getCurrentTime()}]${operation.name} failed: ${error.message}`;
      crimesUI.resultsDisplay.textContent = errorMessage;
      utils.updateStatus(crimesUI.statusText, `Error`, false, true);
      setCrimeCooldown(CONFIG.defaultCooldown);
      return null;
    }
  };

  const checkAndExecuteAutoCrimes = async () => {
    if (!isAutoCrimeRunning) return;

    try {
      const data = await api.getCharacterUpdates();
      if (!data || !data.resources) {
        crimesUI.resultsDisplay.textContent = `[${getCurrentTime()}] Failed to fetch updates`;
        return;
      }

      if (data?.jail?.isInJail) {
        crimesUI.resultsDisplay.textContent = `[${getCurrentTime()}] Character is in jail - skipping`;
        return;
      }

      const getResourceCost = (type, resource) => {
        const input = document.getElementById(`${type}${resource}Cost`);
        return input ? Math.max(0, parseInt(input.value) || 0) : 0;
      };

      const resourceCosts = {
        crime: { nerve: getResourceCost("crime", "nerve") },
        gta: { focus: getResourceCost("gta", "focus") },
        heist: { wit: getResourceCost("heist", "wit") },
      };

      const { nerve, focus, wit } = data.resources;
      const currentNerve = parseFloat(nerve.current);
      const currentFocus = parseFloat(focus.current);
      const currentWit = parseFloat(wit.current);

      // Execute the highest priority crime if we have resources
      if (currentWit >= resourceCosts.heist.wit) {
        crimesUI.resultsDisplay.textContent = `[${getCurrentTime()}] Auto-starting heist (Wit: ${currentWit})`;
        await executeCrimeOperation("heist");
        return;
      }

      if (data.timers.gta === true && currentFocus >= resourceCosts.gta.focus) {
        crimesUI.resultsDisplay.textContent = `[${getCurrentTime()}] Auto-committing GTA (Focus: ${currentFocus})`;
        await executeCrimeOperation("gta");
        return;
      }

      if (
        data.timers.crime === true &&
        currentNerve >= resourceCosts.crime.nerve
      ) {
        crimesUI.resultsDisplay.textContent = `[${getCurrentTime()}] Auto-committing crime (Nerve: ${currentNerve})`;
        await executeCrimeOperation("crime");
        return;
      }

      const resourceMessage = `[${getCurrentTime()}] Insufficient resources (Nerve:${currentNerve} Focus:${currentFocus} Wit:${currentWit})`;
      crimesUI.resultsDisplay.textContent = resourceMessage;
    } catch (error) {
      crimesUI.resultsDisplay.textContent = `[${getCurrentTime()}] Error: ${error.message}`;
    }
  };

  trackedAddEventListener(autoCrimeToggle, "change", (e) => {
    isAutoCrimeRunning = e.target.checked;

    if (isAutoCrimeRunning) {
      utils.updateStatus(crimesUI.statusText, "Auto-crime active", true);
      crimesUI.resultsDisplay.textContent = `[${getCurrentTime()}] Auto-crime system activated`;

      // Run immediately and then every 5 seconds
      checkAndExecuteAutoCrimes();
      autoCrimeIntervalId = trackedSetInterval(
        checkAndExecuteAutoCrimes,
        CONFIG.autoCrimeInterval,
      );
    } else {
      utils.updateStatus(crimesUI.statusText, "Ready", true);
      clearInterval(autoCrimeIntervalId);
      crimesUI.resultsDisplay.textContent = `[${getCurrentTime()}] Auto-crime system deactivated`;
    }
  });

  // ==========12. Public API==========
  return {
    // Bust Scanner
    startBustScanner: () => {
      scannerToggle.checked = true;
      scannerToggle.dispatchEvent(new Event("change"));
    },
    stopBustScanner: () => {
      scannerToggle.checked = false;
      scannerToggle.dispatchEvent(new Event("change"));
    },
    getBustScannerStatus: () => (isBustRunning ? "ACTIVE" : "INACTIVE"),
    setScanInterval: (ms) => {
      intervalInput.value = Math.max(50, Math.min(1000, ms));
    },
    getScanInterval: () => parseInt(intervalInput.value) || 100,

    // Auto-Trainer
    startTrainer: () => {
      autoTrainerToggle.checked = true;
      autoTrainerToggle.dispatchEvent(new Event("change"));
    },
    stopTrainer: () => {
      autoTrainerToggle.checked = false;
      autoTrainerToggle.dispatchEvent(new Event("change"));
    },
    getTrainerStatus: () => (isTrainerRunning ? "ACTIVE" : "INACTIVE"),
    manualTrain: async (stat) => {
      try {
        // Force update for manual training
        const characterData = await api.getCharacterUpdates();
        if (!characterData) {
          trainerUI.resultsDisplay.textContent = `[${getCurrentTime()}] Failed to fetch character updates`;
          return null;
        }

        const minEnergy = parseInt(energyInput.value) || CONFIG.minTrainEnergy;
        currentEnergy = parseFloat(
          characterData?.resources?.energy?.current || 0,
        );
        if (currentEnergy < minEnergy) {
          trainerUI.resultsDisplay.textContent = `[${getCurrentTime()}] Not enough energy (${currentEnergy}/${minEnergy})`;
          return { error: "Not enough energy" };
        }

        trainerUI.resultsDisplay.textContent = `Manually training ${stat}...`;
        const data = await api.call("/fight-club/train", "POST", { stat });
        if (data.status === "error") {
          throw new Error(data.message);
        }

        const resultMessage = `[${getCurrentTime()}]${data.message}\n:Exp gained: ${data.expGained || "N/A"}`;
        trainerUI.resultsDisplay.textContent = resultMessage;

        if (isTrainerRunning) {
          lastRun = new Date();
          const intervalMinutes =
            parseInt(trainerIntervalInput.value) || CONFIG.defaultInterval;
          nextRun = new Date(lastRun.getTime() + intervalMinutes * 60000);
          updateRunTimes();
        }

        return data;
      } catch (error) {
        trainerUI.resultsDisplay.textContent = `[${getCurrentTime()}] Training failed: ${error.message}`;
        return null;
      }
    },

    // Crimes
    commitCrime: (id) => {
      if (id) crimeIdInput.value = id;
      executeCrimeOperation("crime");
    },
    commitGTA: (id) => {
      if (id) gtaIdInput.value = id;
      executeCrimeOperation("gta");
    },
    startHeist: (id) => {
      if (id) heistIdInput.value = id;
      executeCrimeOperation("heist");
    },

    // Auto-Crime System
    startAutoCrimes: () => {
      autoCrimeToggle.checked = true;
      autoCrimeToggle.dispatchEvent(new Event("change"));
    },
    stopAutoCrimes: () => {
      autoCrimeToggle.checked = false;
      autoCrimeToggle.dispatchEvent(new Event("change"));
    },
    setResourceCost: (type, resource, value) => {
      const input = document.getElementById(`${type}${resource}Cost`);
      if (input) input.value = Math.max(0, value);
    },
    getResourceCost: (type, resource) => {
      const input = document.getElementById(`${type}${resource}Cost`);
      return input ? parseInt(input.value) || 0 : 0;
    },
    getCharacterUpdates: () => api.getCharacterUpdates(),
    getCurrentEnergy: () => currentEnergy,

    // UI Controls
    minimize: () => !isMinimized && toggleButton.click(),
    maximize: () => isMinimized && toggleButton.click(),
    toggleMinimize: () => toggleButton.click(),
    isMinimized: () => isMinimized,
    switchTab: (tabName) => switchTab(tabName.toLowerCase()),

    // Resource Management
    destroy,
    getResourceUsage: () => ({
      intervals: resources.intervals.length,
      timeouts: resources.timeouts.length,
      listeners: resources.listeners.length,
      elements: resources.elements.length,
    }),
  };
}

// Initialize the scanner
const enhancedScanner = initializeEnhancedScanner();
