// Animates the first-paint splash's progress bar and stage label until React replaces it.
// Kept in its own file (not inline in index.html) because the site's Content-Security-Policy
// only allows scripts from its own origin.
(function () {
  var root = document.querySelector(".splash");
  if (!root) return;
  var fills = root.querySelectorAll(".splash-topline-fill, .splash-fill");
  var stage = root.querySelector(".splash-stage");
  var percentLabel = root.querySelector(".splash-percent");
  var steps = root.querySelectorAll(".splash-steps li");
  var stages = [[0, "Starting up"], [18, "Securing your session"], [55, "Preparing your workspace"], [80, "Loading the latest updates"]];
  function tick() {
    if (!root.isConnected) return;
    var p = Math.min(94, Math.round(100 * (1 - Math.exp(-performance.now() / 3200))));
    for (var i = 0; i < fills.length; i++) fills[i].style.width = p + "%";
    percentLabel.textContent = p + "%";
    var label = stages[0][1];
    for (var s = 0; s < stages.length; s++) if (p >= stages[s][0]) label = stages[s][1];
    stage.textContent = label;
    for (var n = 0; n < steps.length; n++) steps[n].className = p >= Number(steps[n].getAttribute("data-from")) ? "is-on" : "";
    setTimeout(tick, 120);
  }
  tick();
})();
