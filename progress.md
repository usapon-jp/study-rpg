# 進捗メモ（2026-05-06）

## 1. 現在の進捗

- GitHub リポジトリ `git@github.com:usapon-jp/study-rpg.git` の `main` に接続済み。
- 最新のコミット済み状態は `ebdbc59 Add study result scan flow`。
- 実装済み・push済み:
  - タイマー終了後のリザルト画面。
  - 成果スキャン用の基本フォーム。
  - AI解析用JSONプレビュー。
  - XP/コイン/ログ/町の成長度への保存。
  - 「リーフェルに聞く」でJSONをコピーし、設定したChatGPT Project URLへ遷移。
  - リーフェル素材を全身表示に差し替え。
- 未コミットのWIP差分あり:
  - `src/App.jsx`
  - `src/styles.css`
  - `.github/workflows/deploy.yml`
  - `vite.config.js`
- WIP内容:
  - 成果スキャン画面を、教科 `[英語][数学][理科][社会][国語]` と目的 `[宿題][テスト勉強][チャレンジ][自由学習]` の選択式に変更中。
  - `Drive/{教科}/{目的}/` のフォルダ想定表示と、Google Drive検索URLを開く導線を追加中。
  - スキャン後カード（例: `📘 英語 / 宿題`, `✔ ワーク p12〜15`, `✨ +XP`, `🪙 +コイン`）を追加中。
  - GitHub Pages用と思われる `vite.config.js` と deploy workflow が未追跡で存在。

## 2. 未完了タスク

- ユーザー最新要望「ガチャ演出入れて」は未実装。該当箇所を確認しただけで、コード変更はまだしていない。
- 成果スキャンWIPは途中で中断されたため、ビルド確認・ブラウザ確認が未完了。
- `scanStudyResult()` 内で `scanDraft` の古い参照を使う可能性があるため、次回確認が必要。
- `ResultModal` の新UIはCSSを追加中だが、横長iPad表示での見た目確認がまだ。
- `.github/workflows/deploy.yml` と `vite.config.js` をコミット対象にするか判断が必要。
- WIP差分をコミットする前に `npm run build` で構文確認が必要。

## 3. 次にやるべきこと

1. まず現在のWIP差分を確認する。
2. 成果スキャンWIPを完成させるか、いったん別コミットに分けるか決める。
3. ユーザー最新要望のガチャ演出を実装する。
   - ガチャボタン押下時に演出状態を立てる。
   - クローゼット/光/葉っぱ/カード開封のアニメーションを追加。
   - 演出後に結果カードを表示。
   - 10連はカードが順番に出るようにする。
4. `npm run build` を実行。
5. ブラウザでガチャ画面を確認。
6. 問題なければコミットして `main` にpush。

## 4. 必要なコマンド

```bash
cd "/Users/yoshidafumio/Documents/New project/tama-study-rpg"
git status --short
git diff --stat
git diff -- src/App.jsx
git diff -- src/styles.css
npm run build
npm run dev
git add src/App.jsx src/styles.css
git commit -m "Add gacha reveal animation"
git push origin main
```

GitHub Pages設定も含める場合:

```bash
git add vite.config.js .github/workflows/deploy.yml
git commit -m "Configure GitHub Pages deployment"
git push origin main
```

## 5. 注意点

- 現在のWIP差分はまだビルド未確認。次回、最初に `npm run build` を走らせること。
- ユーザーは「レート制限が近いので停止」と言っているため、次回までは追加実装を進めない。
- WIPコードを不用意に戻さない。ユーザーが明示しない限り `git reset --hard` や `git checkout --` は使わない。
- `progress.md` のコミットでは、WIP実装ファイルはステージしない。
- ガチャ演出では精霊を排出しない仕様を守る。
- iPad Safari / 横長UIが主対象。ガチャ演出は横画面でカードやボタンが見切れないようにする。
- GitHub Pagesで動かす場合、`vite.config.js` の `base: "/study-rpg/"` が必要。
