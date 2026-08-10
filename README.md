# Lab Operation Gadget

Google スプレッドシートの楽曲データを元に、WIKIWIKI ページの自動生成・更新・表組み出力を行う Discord Botです。
songupdate,tablegenerate,maketable,newsongはParadigm:Reboot wiki専用です。
自身でも使用したい場合色々改造してください
基本的にmain.jsで起動して、commandsフォルダ内にコマンドを処理するファイルが入ってます。
commandsフォルダ内に同じように新しいコマンドファイル作って入れて再起動したらdiscord上で使えます
.envとapi-key.jsonが大事なやつ、他は勝手に作られるやつです。


---

## 主機能

* **`/songupdate`**: スプレッドシートの指定行から楽曲情報を取得し、WIKIWIKI の該当ページを自動更新。ジャケット画像が未添付の場合は Google Drive から自動検索してアップロード。
* **`/tablegenerate`**: 指定した行の楽曲データから、用途に応じた各種表組み（楽曲一覧、コンポーザー一覧、SHOP用、段位用など）を対話形式で生成。
* **`/maketable`**: 指定行の楽曲データから標準的な Wiki 表組みテキストコードを出力。
* **`/newsong`**: 新曲の基本情報を元に、WIKIWIKI へ新規ページを作成。
* **`/restart`**: PM2 を介したボットの再起動と、再起動にかかったダウンタイムを出力。

---

## 仕様

* **Language**: Node.js (v18+)
* **Framework**: Discord.js v14
* **APIs**:
  * WIKIWIKI REST API
  * Google Sheets API (`google-spreadsheet`)
  * Google Drive API (`googleapis`)
* **Process Manager**: PM2

---

## ディレクトリ構造

```text
discordbot/
├── commands/               # Discord スラッシュコマンド
│   ├── maketable.js
│   ├── newsong.js
│   ├── restart.js
│   ├── songupdate.js
│   ├── tablegenerate.js
│   └── others/             # 補助モジュール（認証・パース・画像処理）
│       ├── api.js          # Google API & WikiWiki 認証
│       ├── imageupload.js  # 画像存在チェック & Drive連携アップロード
│       └── songParser.js   # スプレッドシート行データのパース処理
├── .gitignore
├── main.js                 # 本体の起動ポイント
└── package.json
```

---

## セットアップ & 実行方法

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定 (`.env`)
プロジェクトルート直下に `.env` ファイルを作成し、以下の環境変数を設定してください。

```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
WIKI_NAME=your_wikiwiki_name
WIKI_ID=your_wikiwiki_id
WIKI_PASS=your_wikiwiki_password
SPREADSHEET_ID=your_google_spreadsheet_id
DRIVE_ID=your_google_drive_folder_id
```

また、Google API 認証用の鍵ファイル `api-key.json` をルート直下に配置してください。

### 3. 起動

```bash
pm2 start main.js
```