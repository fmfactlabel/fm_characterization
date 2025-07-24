// Tooltips
$(function () {
    $('[data-toggle="tooltip"]').tooltip()
});

// BibTeX copy function
const bibtexEntry = `
@article{Horcas2025_FMFactLabel,
  author       = {Jos{\'{e}} Miguel Horcas and Jos{\'{e}} A. Galindo and Lidia Fuentes and David Benavides},
  title        = {{FM} fact label},
  journal      = {Sci. Comput. Program.},
  volume       = {240},
  pages        = {103214},
  year         = {2025},
  url          = {https://doi.org/10.1016/j.scico.2024.103214},
  doi          = {10.1016/J.SCICO.2024.103214},
  timestamp    = {Mon, 21 Oct 2024 11:11:55 +0200},
  biburl       = {https://dblp.org/rec/journals/scp/HorcasGFB25.bib},
  bibsource    = {dblp computer science bibliography, https://dblp.org}
}`;

async function copyBibTeX() {
  try {
    await navigator.clipboard.writeText(bibtexEntry);
    console.log("Copied to clipboard!");
  } catch (err) {
    console.error("Failed to copy: ", err);
  }
}

// Version loading
fetch("version.json")
  .then(response => response.json())
  .then(data => {
    document.getElementById("app-version").textContent = data.version;
  })
  .catch(error => {
    console.error("Error loading version:", error);
    document.getElementById("app-version").textContent = "unknown";
  });


// Fetch the official version from version.json to show on the URL
fetch("version.json")
  .then(response => response.json())
  .then(data => {
    const officialVersion = data.version;
    const url = new URL(window.location);
    const urlVersion = url.searchParams.get("v");

    // If URL version exists and does not match the official version, redirect to error page
    if (urlVersion && urlVersion !== officialVersion) {
      window.location.href = "/error_version.html"; // Redirect to your error page
    } else {
      // If version matches or not in URL, display it on the page
      const versionElem = document.getElementById("app-version");
      if (versionElem) {
        versionElem.textContent = officialVersion;
      }

      // If the version parameter is missing in the URL, add it without reloading the page
      if (!urlVersion) {
        url.searchParams.set("v", officialVersion);
        window.history.replaceState({}, '', url);
      }
    }
  })
  .catch(error => {
    console.error("Error loading version:", error);
    const versionElem = document.getElementById("app-version");
    if (versionElem) {
      versionElem.textContent = "unknown";
    }
  });
