const vscode = require('vscode');
const fs = require('fs-extra');
const path = require('path');
const lineColumn = require('line-column');
const getPackageInfos = require('./getPackageInfos');
const setWarningDecorations = require('./setWarningDecorations');

module.exports = class Explorer {
  constructor(context) {
    this.context = context;
    this.rootPath = vscode.workspace.rootPath;

    this.packageFileCache = '';
    this.warningList = [];
  }

  check() {
    const packageFile = fs.readFileSync(path.join(this.rootPath, 'package.json'), 'utf-8');
    if (packageFile !== this.packageFileCache) {
      // Update cache
      this.packageFileCache = packageFile;

      const packageInfos = getPackageInfos();
      for (let packageName in packageInfos) {
        this.checkMaxSatisfying(packageInfos[packageName]);
      }

      this.setDecorations();
    }
  }

  // If the highest satisfies version is not equal to local installed version, show warning.
  checkMaxSatisfying(packageInfo) {
    if (
      packageInfo.satisfying &&
      packageInfo.local !== packageInfo.satisfying
    ) {
      const matched = this.packageFileCache.match(`"${packageInfo.name}"`);

      if (matched && matched.index) {
        const { Position, Range } = vscode;

        const start = lineColumn(this.packageFileCache).fromIndex(matched.index);
        const end = lineColumn(this.packageFileCache).fromIndex(matched.index + packageInfo.name.length);

        const range = new Range(
          new Position(start.line - 1, start.col - 1),
          new Position(end.line - 1, end.col - 1)
        );

        this.warningList.push({
          range,
          contentText: `@${packageInfo.satisfying} will be installed. (local@${packageInfo.local}, latest@${packageInfo.latest})`
        });
      }
    }
  }

  setDecorations() {
    setWarningDecorations(this.context, this.warningList);
  }
};