let dirHandle;
let directoryData;
let d3HierarchyData;
let currentIndex = 0;

const addButton = document.getElementById("add-button");
const refreshButton = document.getElementById("refresh-button");
const topTextContent = document.getElementById("top-text-content");
const treeTextContent = document.getElementById("tree-text-content");
const fileTreeContainer = document.getElementById("file-tree-container");

const texts = [
  "Tip: Alt + click to Expand / Collapse slowly",
  "Tip: Use your mouse wheel or pinch to zoom in/out",
  "Source: https://github.com/dhextras/File-Viz",
];

const errorText =
  "Error Accessing Directory Try Reloading or contact Devoloper { Dhextras }.";
const initialText =
  "Pls Choose a folder to view the Tree structure.\nSupported Browsers: Chrome 86, Opera 72, Edge 86";
const reloadErrorText = "Try selecting a Directory before reloading.";


document.addEventListener("DOMContentLoaded", () => {
  displayText(texts);
  addButton.addEventListener("click", accessDirectory);
  refreshButton.addEventListener("click", reloadDirectory);
});


/**
 * Chart function to create a collapsible tree chart using D3.js.
 * This function is based on the example from the official D3.js ObservableHQ notebook:
 * https://observablehq.com/@d3/collapsible-tree
 *
 * @param {Object} data - The hierarchical data to visualize as a tree.
 * @returns {Element} - The SVG element containing the tree chart.
 */
function createFileTree(data) {
  // Specify the charts’ dimensions. The height is variable, depending on the laydirectoryData.
  const width = 928;
  const marginTop = 10;
  const marginRight = 10;
  const marginBottom = 10;
  const marginLeft = 100;

  // Rows are separated by dx pixels, columns by dy pixels. These names can be counter-intuitive
  // (dx is a height, and dy a width). This because the tree must be viewed with the root at the
  // “bottom”, in the data domain. The width of a column is based on the tree’s height.
  const root = d3.hierarchy(data);
  const dx = 15;
  const dy = 200;

  // Define the tree laydirectoryData and the shape for links.
  const tree = d3.tree().nodeSize([dx, dy]);
  const diagonal = d3
    .linkHorizontal()
    .x((d) => d.y)
    .y((d) => d.x);

  // Create the SVG container, a layer for the links and a layer for the nodes.
  const svg = d3
    .create("svg")
    .attr("id", "file-tree-svg")
    .attr("width", width)
    .attr("height", dx)
    .attr("viewBox", [-marginLeft, -marginTop, width, dx])
    .attr(
      "style",
      "width: 100%; height: 100%; font: 12px sans-serif; user-select: none;"
    );

  // Transition Zooming
  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 10])
    .on("zoom", (event) => {
      const { transform } = event;
      gNode.attr("transform", transform);
      gLink.attr("transform", transform);
    });

  svg.call(zoom);

  const gLink = svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke", "#008eff")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.8);

  const gNode = svg
    .append("g")
    .attr("cursor", "pointer")
    .attr("pointer-events", "all");

  function update(event, source) {
    const duration = event?.altKey ? 2500 : 250; // hold the alt key to slow down the transition
    const nodes = root.descendants().reverse();
    const links = root.links();

    // Compute the new tree laydirectoryData.
    tree(root);

    let left = root;
    let right = root;
    root.eachBefore((node) => {
      if (node.x < left.x) left = node;
      if (node.x > right.x) right = node;
    });

    const height = right.x - left.x + marginTop + marginBottom;

    const transition = svg
      .transition()
      .duration(duration)
      .attr("height", height)
      .attr("viewBox", [-marginLeft, left.x - marginTop, width, height])
      .tween(
        "resize",
        window.ResizeObserver ? null : () => () => svg.dispatch("toggle")
      );

    // Update the nodes…
    const node = gNode.selectAll("g").data(nodes, (d) => d.id);

    // Enter any new nodes at the parent's previous position.
    const nodeEnter = node
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${source.y0},${source.x0})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)
      .on("click", (event, d) => {
        d.children = d.children ? null : d._children;
        update(event, d);
      });

    nodeEnter
      .append("circle")
      .attr("r", 5)
      .attr("fill", (d) => (d._children ? "#0078d7" : "#bfbfbf"))
      .attr("stroke-width", 10);

    nodeEnter
      .append("text")
      .attr("dy", (d) => (d._children ? "0.31em" : "0.35em"))
      .attr("x", (d) => (d._children ? -8 : 8))
      .attr("text-anchor", (d) => (d._children ? "end" : "start"))
      .attr("font-weight", (d) => (d._children ? "bold" : "none"))
      .attr("font-size", (d) => (d._children ? "13px" : "12px"))
      .text((d) => d.data.name)
      .clone(true)
      .lower()
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .attr("stroke", "white");

    // Transition nodes to their new position.
    const nodeUpdate = node
      .merge(nodeEnter)
      .transition(transition)
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .attr("fill-opacity", 1)
      .attr("stroke-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    const nodeExit = node
      .exit()
      .transition(transition)
      .remove()
      .attr("transform", (d) => `translate(${source.y},${source.x})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0);

    // Update the links…
    const link = gLink.selectAll("path").data(links, (d) => d.target.id);

    // Enter any new links at the parent's previous position.
    const linkEnter = link
      .enter()
      .append("path")
      .attr("d", (d) => {
        const o = { x: source.x0, y: source.y0 };
        return diagonal({ source: o, target: o });
      });

    // Transition links to their new position.
    link.merge(linkEnter).transition(transition).attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link
      .exit()
      .transition(transition)
      .remove()
      .attr("d", (d) => {
        const o = { x: source.x, y: source.y };
        return diagonal({ source: o, target: o });
      });

    // Stash the old positions for transition.
    root.eachBefore((d) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  // Do the first update to the initial configuration of the tree — where a number of nodes
  // are open (arbitrarily selected as the root, plus nodes with 7 letters).
  root.x0 = dy / 2;
  root.y0 = 0;
  root.descendants().forEach((d, i) => {
    d.id = i;
    d._children = d.children;
    if (d.depth && d.data.name.length !== 7) d.children = null;
  });

  update(null, root);

  return svg.node();
}

// Handler Functions for Adding and reloading Directories
async function accessDirectory() {
  try {
    directoryData = {};
    dirHandle = await window.showDirectoryPicker();

    updateLoadingScreen();
    await handleDirectoryEntry(dirHandle, directoryData);

    d3HierarchyData = convertDataToD3Hierarchy(directoryData, dirHandle.name);

    renderFileTree(d3HierarchyData);
  } catch (error) {
    console.error("Error accessing files:", error);

    treeTextContent.textContent = errorText;
    treeTextContent.style.color = "red";

    setTimeout(() => {
      treeTextContent.style.color = "rgb(1, 146, 61)";
      treeTextContent.innerText = initialText;
    }, 3000);

    dirHandle = null;
  }
}

async function reloadDirectory() {
  if (dirHandle) {
    updateLoadingScreen();
    await handleDirectoryEntry(dirHandle, directoryData);

    d3HierarchyData = convertDataToD3Hierarchy(directoryData, dirHandle.name);
    renderFileTree(d3HierarchyData);
  } else {
    console.log("Try selecting a Directory before reloading.");
    treeTextContent.textContent = reloadErrorText;

    setTimeout(() => {
      treeTextContent.innerText = initialText;
    }, 3000);
  }
}

async function handleDirectoryEntry(dirHandle, directoryData) {
  for await (const entry of dirHandle.values()) {
    if (entry.kind === "file") {
      const file = await entry.getFile();
      directoryData[file.name] = file;
    }
    if (entry.kind === "directory") {
      const newDirectoryData = (directoryData[entry.name] = {});
      await handleDirectoryEntry(entry, newDirectoryData);
    }
  }
}

function convertDataToD3Hierarchy(data, name) {
  return {
    name,
    children: Object.keys(data).map((key) => {
      if (data[key] instanceof File) {
        return { name: key, type: "file" };
      } else {
        return convertDataToD3Hierarchy(data[key], key);
      }
    }),
  };
}

// Few Boilerplate codes
function renderFileTree(data) {
  const chart = createFileTree(data);
  fileTreeContainer.textContent = "";
  fileTreeContainer.appendChild(chart);
}

function displayText() {
  const text = texts[currentIndex];
  let index = 0;
  const typingInterval = 65;

  const typingEffect = setInterval(() => {
    topTextContent.textContent += text[index];
    index++;

    if (index === text.length) {
      clearInterval(typingEffect);

      setTimeout(() => {
        topTextContent.classList.remove("bounce");
        disappearText();
      }, 2000);
    }
  }, typingInterval);
}

function disappearText() {
  const text = topTextContent.textContent;
  let index = 0;

  const disappearingInterval = 3;

  const disappearingEffect = setInterval(() => {
    topTextContent.textContent = text.slice(index + 1, -(index + 1));
    index++;

    if (index >= text.length - 1) {
      clearInterval(disappearingEffect);

      topTextContent.textContent = "";
      topTextContent.classList.add("bounce");

      currentIndex = (currentIndex + 1) % texts.length;
      displayText();
    }
  }, disappearingInterval);
}

function updateLoadingScreen() {
  const existingSvg = document.getElementById("file-tree-svg");

  if (existingSvg) {
    fileTreeContainer.removeChild(existingSvg);
  }

  fileTreeContainer.textContent = "";
  fileTreeContainer.innerHTML =
    '<div class="tree-extra-stuff" style="color: black;"><i class="fa-solid fa-spinner fa-spin fa-2xl"></i></div>';
}
