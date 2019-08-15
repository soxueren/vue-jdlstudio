import CodeMirror from "codemirror/lib/codemirror";

const mainKeywords = [
    "application",
    "deployment",
    "entity",
    "enum",
    "relationship",
    "paginate",
    "dto",
    "service",
    "skipClient",
    "skipServer",
    "search",
    "angularSuffix",
    "filter"
  ],
  relationshipKws = ["OneToOne", "OneToMany", "ManyToOne", "ManyToMany"],
  appInnerKws = ["config", "entities"],
  validationKws = [
    "required",
    "minlength",
    "maxlength",
    "min",
    "max",
    "minbytes",
    "maxbytes",
    "pattern",
    "unique"
  ],
  generalKws = ["with", "all", "except", "to"],
  paginationKws = ["pagination", "pager", "infinite-scroll"],
  dtoKws = ["mapstruct"],
  serviceKws = ["serviceClass", "serviceImpl"],
  searchKws = ["ElasticSearch"],
  apptypeKws = [
    "microservice",
    "gateway",
    "monolith",
    "uaa",
    "reactive",
    "reactive-micro"
  ],
  typeKws = [
    "String",
    "Integer",
    "Long",
    "BigDecimal",
    "Float",
    "Double",
    "Boolean",
    "LocalDate",
    "ZonedDateTime",
    "Instant",
    "Blob",
    "AnyBlob",
    "ImageBlob"
  ],
  appKeysKws = [
    "baseName",
    "applicationType",
    "authenticationType",
    "buildTool",
    "cacheProvider",
    "clientFramework",
    "clientPackageManager",
    "databaseType",
    "devDatabaseType",
    "enableHibernateCache",
    "enableSwaggerCodegen",
    "enableTranslation",
    "jhiPrefix",
    "languages",
    "messageBroker",
    "nativeLanguage",
    "packageName",
    "prodDatabaseType",
    "searchEngine",
    "serviceDiscoveryType",
    "skipClient",
    "skipServer",
    "serverPort",
    "skipUserManagement",
    "testFrameworks",
    "uaaBaseName",
    "useSass",
    "websocket"
  ],
  deploymentKeysKws = [
    "deploymentType",
    "gatewayType",
    "monitoring",
    "directoryPath",
    "appsFolders",
    "clusteredDbApps",
    "consoleOptions",
    "serviceDiscoveryType",
    "dockerRepositoryName",
    "dockerPushCommand",
    "kubernetesNamespace",
    "kubernetesServiceType",
    "ingressDomain",
    "istio",
    "istioRoute",
    "enableRancherLoadBalancing",
    "openshiftNamespace",
    "storageType"
  ],
  specialValueKws = [
    "en",
    "no",
    "true",
    "sql",
    "mongodb",
    "couchbase",
    "cassandra",
    "h2Disk",
    "h2Memory",
    "mysql",
    "mariadb",
    "postgresql",
    "oracle",
    "mssql",
    "gatling",
    "cucumber",
    "protractor",
    "angularX",
    "react",
    "eureka",
    "consul",
    "jwt",
    "oauth2",
    "session",
    "ehcache",
    "hazelcast",
    "infinispan",
    "memcached",
    "maven",
    "gradle",
    "docker-compose",
    "kubernetes",
    "openshift",
    "rancher-compose",
    "zuul",
    "traefik",
    "prometheus",
    "elk",
    "curator",
    "zipkin",
    "LoadBalancer",
    "NodePort",
    "Ingress",
    "manualInjection",
    "autoInjection",
    "ephemeral",
    "persistent",
    "default"
  ],
  WORD = /[\w$]+/,
  RANGE = 500;

const keywords = mainKeywords.concat(
  typeKws,
  relationshipKws,
  validationKws,
  generalKws,
  paginationKws,
  dtoKws,
  serviceKws,
  apptypeKws,
  appKeysKws,
  deploymentKeysKws,
  specialValueKws
);

// jdl registerHelper
CodeMirror.registerHelper("hint", "anyword", function(editor, options) {
  var word = (options && options.word) || WORD;
  var range = (options && options.range) || RANGE;
  var cur = editor.getCursor(),
    curLine = editor.getLine(cur.line);
  var end = cur.ch,
    start = end;
  while (start && word.test(curLine.charAt(start - 1))) --start;
  var curWord = start != end && curLine.slice(start, end);

  var list = [],
    seen = {};
  var re = new RegExp(word.source, "g");
  for (var dir = -1; dir <= 1; dir += 2) {
    var line = cur.line,
      endLine =
        Math.min(
          Math.max(line + dir * range, editor.firstLine()),
          editor.lastLine()
        ) + dir;
    for (; line != endLine; line += dir) {
      var text = editor.getLine(line),
        m;
      while ((m = re.exec(text))) {
        if (line == cur.line && m[0] === curWord) continue;
        if (
          (!curWord || m[0].lastIndexOf(curWord, 0) == 0) &&
          !Object.prototype.hasOwnProperty.call(seen, m[0])
        ) {
          seen[m[0]] = true;
          list.push(m[0]);
        }
      }
    }
  }
  if (options && options.list) {
    options.list.forEach(function(item) {
      if (
        (!curWord || item.toLowerCase().startsWith(curWord.toLowerCase())) &&
        list.indexOf(item) === -1
      )
        list.push(item);
    });
  }
  return {
    list: list,
    from: CodeMirror.Pos(cur.line, start),
    to: CodeMirror.Pos(cur.line, end)
  };
});

// jdl mode
CodeMirror.defineMode("jdl", () => {
  var words = {};
  function define(style, list) {
    for (var i = 0; i < list.length; i++) {
      words[list[i]] = style;
    }
  }

  // relationships
  define("relationship", relationshipKws);
  // App inner keywords
  define("relationship", appInnerKws);

  // Keywords
  define("keyword", mainKeywords);

  // types
  define("attribute", appKeysKws);
  define("attribute", deploymentKeysKws);
  define("attribute", typeKws);

  // types
  define("qualifier", validationKws);

  // app types
  define("keyword", apptypeKws);

  // types
  define("special", generalKws.concat(
    paginationKws,
    serviceKws,
    dtoKws,
    searchKws,
    specialValueKws
  ));

  function tokenBase(stream, state) {
    /*if (!stream.sol() && stream.match(/(\s*)([A-Z])/g)){
                return tokenEntity(stream)
            }*/
    if (stream.eatSpace()) return null;

    var sol = stream.sol();
    var ch = stream.next();
    var delimiters = "{ } |".split(" ");

    if (ch === "\\") {
      stream.next();
      return null;
    }

    if (sol && ch === "#") {
      stream.skipToEnd();
      return "meta"; // 'directives'
    }

    var lastCh = stream.string.charAt(stream.start - 1);
    var startCh = stream.string.trim().charAt(0);
    if (
      stream.match("//") ||
      ch === "/" ||
      lastCh + ch === "/*" ||
      startCh === "*"
    ) {
      stream.skipToEnd();
      return "comment";
    }

    if (ch === "+" || ch === "=") {
      return "operator";
    }
    if (ch === "-") {
      stream.eat("-");
      stream.eatWhile(/\w/);
      return "attribute";
    }
    if (
      delimiters.some(function(c) {
        return stream.eat(c);
      })
    )
      return "bracket";

    stream.eatWhile(/[\w-]/);
    var cur = stream.current();
    if (stream.peek() === "=" && /\w+/.test(cur)) return "def";
    if (words.hasOwnProperty(cur)) return words[cur];

    if (
      /[A-Z*]/.test(ch) ||
      (lastCh !== "/" && ch === "*") ||
      (lastCh === "*" && ch !== "/")
    ) {
      stream.eatWhile(/[a-z_]/);
      if (stream.eol() || !/\s[\{\,]/.test(stream.peek())) {
        return "def";
      }
    }

    return null;
  }

  function tokenEntity(stream) {
    var ch;
    while ((ch = stream.next()) != null)
      if (ch == " " && stream.peek() == "{") {
        return "def";
      }
  }

  function tokenize(stream, state) {
    return (state.tokens[0] || tokenBase)(stream, state);
  }

  return {
    startState: function() {
      return { tokens: [] };
    },
    token: function(stream, state) {
      return tokenize(stream, state);
    },
    lineComment: "//",
    fold: "brace"
  };
});

//autocomplete
CodeMirror.commands.autocomplete = function(cm) {
  cm.showHint({ hint: CodeMirror.hint.anyword, list: keywords });
};
export default CodeMirror;
