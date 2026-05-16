let activeBgId = null;

function setBackground(scenario) {
  const el = document.getElementById("bgImage");
  if (!el || !scenario?.background) return;
  if (activeBgId === scenario.id) return;
  activeBgId = scenario.id;
  el.style.backgroundImage = `url("${scenario.background}")`;
}
