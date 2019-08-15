import _ from "lodash";
import parser from "jhipster-core/lib/dsl/api";
import skanaar from "./shannar.custom.js";
import dagre from "dagre";

var nomnoml = nomnoml || {};
//layout
nomnoml.Classifier = function(type, name, compartments) {
  if (type === "ENUM") {
    var enumLabel = _.cloneDeep(compartments[0]),
      label = "<<enumeration>>";
    enumLabel.lines[0] = label;
    compartments.unshift(enumLabel);
  }
  return {
    type: type,
    name: name,
    compartments: compartments
  };
};
nomnoml.Compartment = function(lines, nodes, relations) {
  return {
    lines: lines,
    nodes: nodes,
    relations: relations
  };
};

nomnoml.layout = function(measurer, config, ast) {
  function runDagre(input) {
    return dagre
      .layout()
      .rankSep(config.spacing)
      .nodeSep(config.spacing)
      .edgeSep(config.spacing)
      .rankDir(config.direction)
      .run(input);
  }
  function measureLines(lines, fontWeight) {
    if (!lines.length) return { width: 0, height: config.padding };
    measurer.setFont(config, fontWeight);
    return {
      width: Math.round(
        _.max(_.map(lines, measurer.textWidth)) + 2 * config.padding
      ),
      height: Math.round(
        measurer.textHeight() * lines.length + 2 * config.padding
      )
    };
  }
  function layoutCompartment(c, compartmentIndex) {
    var textSize = measureLines(c.lines, compartmentIndex ? "normal" : "bold");
    c.width = textSize.width;
    c.height = textSize.height;

    if (!c.nodes.length && !c.relations.length) return;

    _.each(c.nodes, layoutClassifier);

    var g = new dagre.Digraph();
    _.each(c.nodes, function(e) {
      g.addNode(e.name, { width: e.width, height: e.height });
    });
    _.each(c.relations, function(r) {
      g.addEdge(r.id, r.start, r.end);
    });
    var dLayout = runDagre(g);

    var rels = _.keyBy(c.relations, "id");
    var nodes = _.keyBy(c.nodes, "name");
    function toPoint(o) {
      return { x: o.x, y: o.y };
    }
    dLayout.eachNode(function(u, value) {
      nodes[u].x = value.x;
      nodes[u].y = value.y;
    });
    dLayout.eachEdge(function(e, u, v, value) {
      var start = nodes[u],
        end = nodes[v];
      rels[e].path = _.map(_.flatten([start, value.points, end]), toPoint);
    });
    var graph = dLayout.graph();
    var graphHeight = graph.height ? graph.height + 2 * config.gutter : 0;
    var graphWidth = graph.width ? graph.width + 2 * config.gutter : 0;

    c.width = Math.max(textSize.width, graphWidth) + 2 * config.padding;
    c.height = textSize.height + graphHeight + config.padding;
  }
  function layoutClassifier(clas) {
    _.each(clas.compartments, layoutCompartment);
    clas.width = _.max(_.map(clas.compartments, "width"));
    clas.height = skanaar.sum(clas.compartments, "height");
    if (clas.type === "HIDDEN") {
      clas.width = 0;
      clas.height = 0;
    }
    clas.x = clas.width / 2;
    clas.y = clas.height / 2;
    _.each(clas.compartments, function(co) {
      co.width = clas.width;
    });
  }
  layoutCompartment(ast);
  return ast;
};
//parse
nomnoml.parse = function(source) {
  function onlyCompilables(line) {
    var ok = line[0] !== "#";
    return ok ? line.replace(/\/\/[^\n\r]*/gm, "") : "";
  }
  var isDirective = function(line) {
    return line.text[0] === "#";
  };
  var lines = source.split("\n").map(function(s, i) {
    return { text: s.trim(), index: i };
  });
  var pureDirectives = _.filter(lines, isDirective);
  var directives = _.zipObject(
    pureDirectives.map(function(line) {
      try {
        var tokens = line.text.substring(1).split(":");
        return [tokens[0].trim(), tokens[1].trim()];
      } catch (e) {
        throw new Error("line " + (line.index + 1));
      }
    })
  );
  var pureDiagramCode = _.map(_.map(lines, "text"), onlyCompilables)
    .join("\n")
    .trim();
  var ast = nomnoml.transformParseIntoSyntaxTree(
    nomnoml.intermediateParse(pureDiagramCode)
  );
  ast.directives = directives;
  return ast;
};

nomnoml.intermediateParse = function(source) {
  return nomnoml.convertToNomnoml(parser.parse(source));
};

nomnoml.convertToNomnoml = function(JDLObj) {
  var parts = [],
    enumParts = [];
  var required = function(line) {
    return line.key === "required";
  };
  var isRequired = function(validations) {
    return _.filter(validations, required).length > 0;
  };
  var setEnumRelation = function(a, part) {
    var enumPart = _.filter(enumParts, function(e) {
      return e.id === a.type;
    });
    if (enumPart.length > 0) {
      parts.push({
        assoc: "->",
        start: part,
        end: enumPart[0],
        startLabel: "",
        endLabel: ""
      });
    }
  };
  var getCardinality = function(cardinality) {
    switch (cardinality) {
      case "one-to-many":
        return "1-*";
      case "one-to-one":
        return "1-1";
      case "many-to-one":
        return "*-1";
      case "many-to-many":
        return "*-*";
      default:
        return "1-*";
    }
  };
  var setParts = function(entity, isEnum) {
    var attrs = [];
    if (isEnum) {
      _.each(entity.values, function(a) {
        attrs.push(a);
      });
    } else {
      _.each(entity.body, function(a) {
        attrs.push(
          a.name + ": " + a.type + (isRequired(a.validations) ? "*" : "")
        );
      });
    }
    return {
      type: isEnum ? "ENUM" : "CLASS",
      id: entity.name,
      parts: [[entity.name], attrs]
    };
  };
  _.each(JDLObj.enums, function(p) {
    if (p.name) {
      // is an enum
      var part = setParts(p, true);
      parts.push(part);
      enumParts.push(part);
    }
  });

  _.each(JDLObj.entities, function(p) {
    if (p.name) {
      // is a classifier
      var part = setParts(p);
      parts.push(part);
      _.each(p.body, function(a) {
        setEnumRelation(a, part);
      });
    }
  });

  _.each(JDLObj.relationships, function(p) {
    parts.push({
      assoc: "->",
      start: setParts(p.from),
      end: setParts(p.to),
      startLabel: p.from.injectedfield ? p.from.injectedfield : "",
      endLabel:
        getCardinality(p.cardinality) +
        " " +
        (p.to.injectedfield ? p.to.injectedfield : "")
    });
  });

  return parts;
};

nomnoml.transformParseIntoSyntaxTree = function(entity) {
  var relationId = 0;

  function transformCompartment(parts) {
    var lines = [];
    var rawClassifiers = [];
    var relations = [];
    _.each(parts, function(p) {
      if (typeof p === "string") lines.push(p);
      if (p.assoc) {
        // is a relation
        rawClassifiers.push(p.start);
        rawClassifiers.push(p.end);
        relations.push({
          id: relationId++,
          assoc: p.assoc,
          start: p.start.parts[0][0],
          end: p.end.parts[0][0],
          startLabel: p.startLabel,
          endLabel: p.endLabel
        });
      }
      if (p.parts) {
        // is a classifier
        rawClassifiers.push(p);
      }
    });
    var allClassifiers = _.map(rawClassifiers, transformItem);
    var noDuplicates = _.map(_.groupBy(allClassifiers, "name"), function(
      cList
    ) {
      return _.max(cList, function(c) {
        return c.compartments.length;
      });
    });

    return nomnoml.Compartment(lines, noDuplicates, relations);
  }

  function transformItem(entity) {
    if (typeof entity === "string") return entity;
    if (_.isArray(entity)) return transformCompartment(entity);
    if (entity.parts) {
      var compartments = _.map(entity.parts, transformCompartment);
      return nomnoml.Classifier(entity.type, entity.id, compartments);
    }
    return undefined;
  }

  return transformItem(entity);
};

//render

nomnoml.render = function(graphics, config, compartment, setFont) {
  var padding = config.padding;
  var g = graphics;
  var vm = skanaar.vector;

  function renderCompartment(compartment, style, level) {
    g.ctx.save();
    g.ctx.translate(padding, padding);
    g.ctx.fillStyle = config.stroke;
    _.each(compartment.lines, function(text, i) {
      g.ctx.textAlign = style.center ? "center" : "left";
      var x = style.center ? compartment.width / 2 - padding : 0;
      var y = (0.5 + (i + 0.5) * config.leading) * config.fontSize;

      g.ctx.fillText(text, x, y);
      if (style.underline) {
        var w = g.ctx.measureText(text).width;
        y += Math.round(config.fontSize * 0.1) + 0.5;
        g.ctx.lineWidth = Math.round(config.fontSize / 10);
        g.path([{ x: x - w / 2, y: y }, { x: x + w / 2, y: y }]).stroke();
        g.ctx.lineWidth = config.lineWidth;
      }
    });
    g.ctx.translate(config.gutter, config.gutter);
    _.each(compartment.relations, function(r) {
      renderRelation(r, compartment);
    });
    _.each(compartment.nodes, function(n) {
      renderNode(n, level);
    });
    g.ctx.restore();
  }

  function textStyle(node, line) {
    if ((node.type !== "ENUM" && line > 0) || line > 1) return {};
    return (
      {
        CLASS: { bold: true, center: true },
        ENUM: { bold: true, center: true },
        LABEL: {},
        INSTANCE: { center: true, underline: true },
        FRAME: { center: false, frameHeader: true },
        ABSTRACT: { italic: true, center: true },
        STATE: { center: true },
        DATABASE: { bold: true, center: true },
        NOTE: {},
        ACTOR: {},
        USECASE: { center: true },
        START: { empty: true },
        END: { empty: true },
        INPUT: { center: true },
        CHOICE: { center: true },
        SENDER: {},
        RECEIVER: {},
        HIDDEN: { empty: true }
      }[node.type] || {}
    );
  }

  function renderNode(node, level) {
    var x = Math.round(node.x - node.width / 2);
    var y = Math.round(node.y - node.height / 2);
    var xCenter = x + node.width / 2;
    var shade = config.fill[level] || _.last(config.fill);
    g.ctx.fillStyle = shade;
    if (node.type === "NOTE") {
      g.circuit([
        { x: x, y: y },
        { x: x + node.width - padding, y: y },
        { x: x + node.width, y: y + padding },
        { x: x + node.width, y: y + node.height },
        { x: x, y: y + node.height },
        { x: x, y: y }
      ])
        .fill()
        .stroke();
      g.path([
        { x: x + node.width - padding, y: y },
        { x: x + node.width - padding, y: y + padding },
        { x: x + node.width, y: y + padding }
      ]).stroke();
    } else if (node.type === "ACTOR") {
      var a = padding / 2;
      var yp = y + a / 2;
      var actorCenter = { x: xCenter, y: yp - a };
      g.circle(actorCenter, a)
        .fill()
        .stroke();
      g.path([{ x: xCenter, y: yp }, { x: xCenter, y: yp + 2 * a }]).stroke();
      g.path([
        { x: xCenter - a, y: yp + a },
        { x: xCenter + a, y: yp + a }
      ]).stroke();
      g.path([
        { x: xCenter - a, y: yp + a + padding },
        { x: xCenter, y: yp + padding },
        { x: xCenter + a, y: yp + a + padding }
      ]).stroke();
    } else if (node.type === "USECASE") {
      var center = { x: xCenter, y: y + node.height / 2 };
      g.ellipse(center, node.width, node.height)
        .fill()
        .stroke();
    } else if (node.type === "START") {
      g.ctx.fillStyle = config.stroke;
      g.circle(xCenter, y + node.height / 2, node.height / 2.5).fill();
    } else if (node.type === "END") {
      g.circle(xCenter, y + node.height / 2, node.height / 3)
        .fill()
        .stroke();
      g.ctx.fillStyle = config.stroke;
      g.circle(
        xCenter,
        y + node.height / 2,
        node.height / 3 - padding / 2
      ).fill();
    } else if (node.type === "STATE") {
      var stateRadius = Math.min(padding * 2 * config.leading, node.height / 2);
      g.roundRect(x, y, node.width, node.height, stateRadius)
        .fill()
        .stroke();
    } else if (node.type === "INPUT") {
      g.circuit([
        { x: x + padding, y: y },
        { x: x + node.width, y: y },
        { x: x + node.width - padding, y: y + node.height },
        { x: x, y: y + node.height }
      ])
        .fill()
        .stroke();
    } else if (node.type === "CHOICE") {
      g.circuit([
        { x: node.x, y: y - padding },
        { x: x + node.width + padding, y: node.y },
        { x: node.x, y: y + node.height + padding },
        { x: x - padding, y: node.y }
      ])
        .fill()
        .stroke();
    } else if (node.type === "PACKAGE") {
      var headHeight = node.compartments[0].height;
      g.rect(x, y + headHeight, node.width, node.height - headHeight)
        .fill()
        .stroke();
      var w = g.ctx.measureText(node.name).width + 2 * padding;
      g.circuit([
        { x: x, y: y + headHeight },
        { x: x, y: y },
        { x: x + w, y: y },
        { x: x + w, y: y + headHeight }
      ])
        .fill()
        .stroke();
    } else if (node.type === "SENDER") {
      g.circuit([
        { x: x, y: y },
        { x: x + node.width - padding, y: y },
        { x: x + node.width + padding, y: y + node.height / 2 },
        { x: x + node.width - padding, y: y + node.height },
        { x: x, y: y + node.height }
      ])
        .fill()
        .stroke();
    } else if (node.type === "RECEIVER") {
      g.circuit([
        { x: x, y: y },
        { x: x + node.width + padding, y: y },
        { x: x + node.width - padding, y: y + node.height / 2 },
        { x: x + node.width + padding, y: y + node.height },
        { x: x, y: y + node.height }
      ])
        .fill()
        .stroke();
    } else if (node.type === "HIDDEN") {
    } else if (node.type === "DATABASE") {
      var cx = xCenter;
      var cy = y - padding / 2;
      var pi = 3.1416;
      g.rect(x, y, node.width, node.height).fill();
      g.path([{ x: x, y: cy }, { x: x, y: cy + node.height }]).stroke();
      g.path([
        { x: x + node.width, y: cy },
        { x: x + node.width, y: cy + node.height }
      ]).stroke();
      g.ellipse({ x: cx, y: cy }, node.width, padding * 1.5)
        .fill()
        .stroke();
      g.ellipse(
        { x: cx, y: cy + node.height },
        node.width,
        padding * 1.5,
        0,
        pi
      )
        .fill()
        .stroke();
    } else if (node.type === "LABEL") {
    } else {
      g.rect(x, y, node.width, node.height)
        .fill()
        .stroke();
    }
    var yDivider = node.type === "ACTOR" ? y + (padding * 3) / 4 : y;
    _.each(node.compartments, function(part, i) {
      var s = textStyle(node, i);
      if (s.empty) return;
      g.ctx.save();
      g.ctx.translate(x, yDivider);
      setFont(config, s.bold ? "bold" : "normal", s.italic);
      renderCompartment(part, s, level + 1);
      g.ctx.restore();
      if (i + 1 === node.compartments.length) return;
      yDivider += part.height;
      if (node.type === "FRAME" && i === 0) {
        var w = g.ctx.measureText(node.name).width + part.height / 2 + padding;
        g.path([
          { x: x, y: yDivider },
          { x: x + w - part.height / 2, y: yDivider },
          { x: x + w, y: yDivider - part.height / 2 },
          { x: x + w, y: yDivider - part.height }
        ]).stroke();
      } else g.path([{ x: x, y: yDivider }, { x: x + node.width, y: yDivider }]).stroke();
    });
  }

  function strokePath(p) {
    if (config.edges === "rounded") {
      var radius = config.spacing * config.bendSize;
      g.ctx.beginPath();
      g.ctx.moveTo(p[0].x, p[0].y);
      for (var i = 1; i < p.length - 1; i++) {
        var vec = vm.diff(p[i], p[i - 1]);
        var bendStart = vm.add(
          p[i - 1],
          vm.mult(vm.normalize(vec), vm.mag(vec) - radius)
        );
        g.ctx.lineTo(bendStart.x, bendStart.y);
        g.ctx.arcTo(p[i].x, p[i].y, p[i + 1].x, p[i + 1].y, radius);
      }
      g.ctx.lineTo(_.last(p).x, _.last(p).y);
      g.ctx.stroke();
    } else g.path(p).stroke();
  }

  var empty = false,
    filled = true,
    diamond = true;

  function renderRelation(r, compartment) {
    var startNode = _.find(compartment.nodes, { name: r.start });
    var endNode = _.find(compartment.nodes, { name: r.end });

    var start = rectIntersection(r.path[1], _.first(r.path), startNode);
    var end = rectIntersection(
      r.path[r.path.length - 2],
      _.last(r.path),
      endNode
    );

    var path = _.flatten([start, _.tail(_.initial(r.path)), end]);
    var fontSize = config.fontSize;

    g.ctx.fillStyle = config.stroke;
    setFont(config, "normal");
    var textW = g.ctx.measureText(r.endLabel).width;
    var labelX = config.direction === "LR" ? -padding - textW : padding;
    g.ctx.fillText(
      r.startLabel,
      start.x + padding,
      start.y + padding + fontSize
    );
    g.ctx.fillText(r.endLabel, end.x + labelX, end.y - padding);

    if (r.assoc !== "-/-") {
      if (g.ctx.setLineDash && skanaar.hasSubstring(r.assoc, "--")) {
        var dash = Math.max(4, 2 * config.lineWidth);
        g.ctx.setLineDash([dash, dash]);
        strokePath(path);
        g.ctx.setLineDash([]);
      } else strokePath(path);
    }

    function drawArrowEnd(id, path, end) {
      if (id === ">" || id === "<") drawArrow(path, filled, end);
      else if (id === ":>" || id === "<:") drawArrow(path, empty, end);
      else if (id === "+") drawArrow(path, filled, end, diamond);
      else if (id === "o") drawArrow(path, empty, end, diamond);
    }

    var tokens = r.assoc.split("-");
    drawArrowEnd(_.last(tokens), path, end);
    drawArrowEnd(_.first(tokens), path.reverse(), start);
  }

  function rectIntersection(p1, p2, rect) {
    if (rect.width === 0 && rect.height === 0) return p2;
    var v = vm.diff(p1, p2);
    for (var t = 1; t >= 0; t -= 0.01) {
      var p = vm.mult(v, t);
      if (
        Math.abs(p.x) <= rect.width / 2 + config.edgeMargin &&
        Math.abs(p.y) <= rect.height / 2 + config.edgeMargin
      )
        return vm.add(p2, p);
    }
    return p2;
  }

  function drawArrow(path, isOpen, arrowPoint, diamond) {
    var size =
      ((config.spacing - 2 * config.edgeMargin) * config.arrowSize) / 30;
    var v = vm.diff(path[path.length - 2], _.last(path));
    var nv = vm.normalize(v);
    function getArrowBase(s) {
      return vm.add(arrowPoint, vm.mult(nv, s * size));
    }
    var arrowBase = getArrowBase(diamond ? 7 : 10);
    var t = vm.rot(nv);
    var arrowButt = diamond
      ? getArrowBase(14)
      : isOpen && !config.fillArrows
      ? getArrowBase(5)
      : arrowBase;
    var arrow = [
      vm.add(arrowBase, vm.mult(t, 4 * size)),
      arrowButt,
      vm.add(arrowBase, vm.mult(t, -4 * size)),
      arrowPoint
    ];
    g.ctx.fillStyle = isOpen ? config.stroke : config.fill[0];
    g.circuit(arrow)
      .fill()
      .stroke();
  }

  function snapToPixels() {
    if (config.lineWidth % 2 === 1) g.ctx.translate(0.5, 0.5);
  }

  g.clear();
  setFont(config, "bold");
  g.ctx.save();
  g.ctx.lineWidth = config.lineWidth;
  g.ctx.lineJoin = "round";
  g.ctx.lineCap = "round";
  g.ctx.strokeStyle = config.stroke;
  g.ctx.scale(config.zoom, config.zoom);
  snapToPixels();
  renderCompartment(compartment, {}, 0);
  g.ctx.restore();
};

//main
function getConfig(d) {
  return {
    arrowSize: +d.arrowSize || 0.5,
    bendSize: +d.bendSize || 0.3,
    direction: { down: "TB", right: "LR" }[d.direction] || "TB",
    gutter: +d.gutter || 5,
    edgeMargin: +d.edgeMargin || 0,
    edges: { hard: "hard", rounded: "rounded" }[d.edges] || "rounded",
    fill: (d.fill || "#21252b;#002b36;#21252b;#002b36").split(";"),
    fillArrows: d.fillArrows === "true",
    font: d.font || "Calibri",
    fontSize: +d.fontSize || 12,
    leading: +d.leading || 1.25,
    lineWidth: +d.lineWidth || 2,
    padding: +d.padding || 8,
    spacing: +d.spacing || 70,
    stroke: d.stroke || "#aaaaaa",
    title: d.title || "jhipster-jdl",
    zoom: +d.zoom || 1
  };
}

function fitCanvasSize(canvas, rect, zoom) {
  canvas.width = rect.width * zoom;
  canvas.height = rect.height * zoom;
}

function setFont(config, isBold, isItalic, graphics) {
  var style = isBold === "bold" ? "bold" : "";
  if (isItalic) style = "italic" + style;
  var defaultFont = "Helvetica, sans-serif";
  var font = skanaar.format(
    "# #pt #, #",
    style,
    config.fontSize,
    config.font,
    defaultFont
  );
  graphics.ctx.font = font;
}

function parseAndRender(code, graphics, canvas, scale) {
  var ast = nomnoml.parse(code);
  var config = getConfig(ast.directives);
  var measurer = {
    setFont: function(a, b, c) {
      setFont(a, b, c, graphics);
    },
    textWidth: function(s) {
      return graphics.ctx.measureText(s).width;
    },
    textHeight: function() {
      return config.leading * config.fontSize;
    }
  };
  var layout = nomnoml.layout(measurer, config, ast);
  fitCanvasSize(canvas, layout, config.zoom * scale);
  config.zoom *= scale;
  nomnoml.render(graphics, config, layout, measurer.setFont);
  return { config: config };
}

nomnoml.draw = function(canvas, code, scale) {
  var skCanvas = skanaar.Canvas(canvas);
  return parseAndRender(code, skCanvas, canvas, scale || 1);
};

export default nomnoml;
