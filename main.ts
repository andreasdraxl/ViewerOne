import * as WEBIFC from "web-ifc";
import * as BUI from "@thatopen/ui";
import Stats from "stats.js";
import * as OBC from "@thatopen/components";
import * as THREE from "three";

// Hauptcontainer der App
const container = document.getElementById("container")!;

const components = new OBC.Components();
const worlds = components.get(OBC.Worlds);

const world = worlds.create<
  OBC.SimpleScene,
  OBC.SimpleCamera,
  OBC.SimpleRenderer
>();

// Einfache Szene erstellen
world.scene = new OBC.SimpleScene(components);
world.renderer = new OBC.SimpleRenderer(components, container);
world.camera = new OBC.SimpleCamera(components);

components.init();

world.camera.controls.setLookAt(12, 6, 8, 0, 0, -10);
world.scene.setup();
world.scene.three.background = null;

// FragmentsManager und IfcLoader initialisieren
const fragments = components.get(OBC.FragmentsManager);
const fragmentIfcLoader = components.get(OBC.IfcLoader);

// WASM-Dateien einrichten
await fragmentIfcLoader.setup();

const excludedCats = [
  WEBIFC.IFCTENDONANCHOR,
  WEBIFC.IFCREINFORCINGBAR,
  WEBIFC.IFCREINFORCINGELEMENT,
];

for (const cat of excludedCats) {
  fragmentIfcLoader.settings.excludedCategories.add(cat);
}
fragmentIfcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;

// Funktion zum Laden einer lokalen IFC-Datei
async function loadLocalIfc(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = async () => {
    const data = reader.result as ArrayBuffer;
    const buffer = new Uint8Array(data);
    const model = await fragmentIfcLoader.load(buffer);
    model.name = file.name;
    world.scene.three.add(model);
  };

  reader.readAsArrayBuffer(file);
}

// Fragments exportieren
function download(file: File) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function exportFragments() {
  if (!fragments.groups.size) {
    return;
  }
  const group = Array.from(fragments.groups.values())[0];
  const data = fragments.export(group);
  download(new File([new Blob([data])], "small.frag"));

  const properties = group.getLocalProperties();
  if (properties) {
    download(new File([JSON.stringify(properties)], "small.json"));
  }
}

// Speicher leeren
function disposeFragments() {
  fragments.dispose();
}

// Performance-Messung hinzufügen
const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);
stats.dom.style.left = "0px";
stats.dom.style.zIndex = "unset";
world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());

// UI initialisieren
BUI.Manager.init();

// UI-Panel für IFC-Import und Export
const ifcLoaderPanel = BUI.Component.create<BUI.PanelSection>(() => {
  return BUI.html`
    <div id="ifc-loader" class="control-panel">
      <bim-panel label="IFC Loader">
        <bim-panel-section label="Controls">
          <input 
            type="file" 
            accept=".ifc" 
            style="margin-top: 10px;" 
            @change="${(event: Event) => {
              loadLocalIfc(event);
            }}" 
          />
          <bim-button label="Export fragments" 
            @click="${() => {
              exportFragments();
            }}"></bim-button>
          <bim-button label="Dispose fragments" 
            @click="${() => {
              disposeFragments();
            }}"></bim-button>
        </bim-panel-section>
      </bim-panel>
    </div>
  `;
});
document.body.append(ifcLoaderPanel);

// Grid-Steuerung hinzufügen
const grids = components.get(OBC.Grids);
const grid = grids.create(world);

const gridControlsPanel = BUI.Component.create<BUI.PanelSection>(() => {
  return BUI.html`
    <div id="grid-controls" class="control-panel">
      <bim-panel label="Grid Controls">
        <bim-panel-section label="Grid Settings">
          <bim-checkbox label="Grid visible" checked 
            @change="${({ target }: { target: BUI.Checkbox }) => {
              grid.config.visible = target.value;
            }}"></bim-checkbox>
          <bim-color-input 
            label="Grid Color" color="#bbbbbb" 
            @input="${({ target }: { target: BUI.ColorInput }) => {
              grid.config.color = new THREE.Color(target.color);
            }}"></bim-color-input>
          <bim-number-input 
            slider step="0.1" label="Grid primary size" value="1" min="0" max="10"
            @change="${({ target }: { target: BUI.NumberInput }) => {
              grid.config.primarySize = target.value;
            }}"></bim-number-input>
          <bim-number-input 
            slider step="0.1" label="Grid secondary size" value="10" min="0" max="20"
            @change="${({ target }: { target: BUI.NumberInput }) => {
              grid.config.secondarySize = target.value;
            }}"></bim-number-input>
        </bim-panel-section>
      </bim-panel>
    </div>
  `;
});
document.body.append(gridControlsPanel);
