const fs = require("fs");

const filePath = "docs/acceptance_criteria.md";
let content = fs.readFileSync(filePath, "utf8");

// Ici on simule les statuts récupérés
// Plus tard on pourra lire un fichier JSON réel
const acStatus = {
  "AC-01": "PASS",
  "AC-02": "PASS",
  "AC-03": "PASS",
  "AC-04": "PARTIAL"
};

const newTable = `
| AC | Description | Statut | Notes |
|----|--------|--------|--------|
| AC-01 | Page principale charge | ${acStatus["AC-01"]} | |
| AC-02 | API répond | ${acStatus["AC-02"]} | |
| AC-03 | CI passe | ${acStatus["AC-03"]} | |
| AC-04 | Automatisation complète | ${acStatus["AC-04"]} | |
`;

content = content.replace(
  /<!-- AC_STATUS_START -->[\s\S]*<!-- AC_STATUS_END -->/,
  `<!-- AC_STATUS_START -->\n${newTable}\n<!-- AC_STATUS_END -->`
);

fs.writeFileSync(filePath, content);
console.log("AC table updated.");
