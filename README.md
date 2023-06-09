# Stable Diffusion WEB UI Prompt Input Ex

Stable Diffusion Web UIにおいて、プロンプト入力欄は最も使用頻度が高いフィールドの一つですが、ダブルクリック時の選択範囲が標準的なtextareaと同じであったり、プロンプトの特性にあったチューニングがされていないため、使いにくい面が目立ちます。

そこで、JavaScriptを使用してプロンプト入力欄の機能を拡張しました。

## 選択範囲の拡張
Ctrl + ダブルクリックでカンマ区切り単位への選択範囲の拡張が可能です。
標準的なダブルクリックでは、「masterpiece, brown short hair, 1girl」の「brown」の部分を選択しても、下図のようになってしまいます。
(ここに画像を挿入)

Ctrl + ダブルクリックで、「brown short hair」までを一度に選択することが可能です。
また、Ctrl + Alt + ダブルクリックをすることで、括弧に囲まれた範囲を一度に選択することができます。
(ここに画像を挿入)
(masterpiece, brown short hair, 1girl)

## 語のシフト
Ctrl + 右、Ctrl + 左で選択している語を左右にシフトして順番を入れ替えることができます。
「masterpiece, brown short hair, 1girl」から「brown, masterpiece short hair, 1girl」へと変更することができます。

また、前回ダブルクリックしたときにどの単位で選択していたかによってまとめて語をシフトします。
1. 語単位のシフト=前回ダブルクリックしていた場合

2. カンマ区切り単位のシフト=前回Ctrl+ダブルクリックしていた場合 

3. 括弧単位のシフト=前回Ctrl+Alt+ダブルクリックしていた場合

## Undo/Redo
標準的なtextareaではプログラムからの変更に対してUndo/Redoが効きません。
そのため、Easy Prompt Selectorやa1111-sd-webui-tagcompleteで挿入したタグを戻すことができませんでした。
Prompt Input Area Exでは独自でUndo/Redo機能を実装しているため、プログラムからの変更に対してUndo/Redoが可能です。

## 強調表示の削除
プロンプトの強調表示を削除するには、Ctlr + Deleteを押します。
例えば、「(long hair:1.1)」というプロンプトを「long hair」に戻すことができます。

## プロンプトのクリーニング
プロンプトについた不要なスペース、タブ、改行、カンマを除去するには、Ctlr + ・を押します。
複数のカンマやスペースをまとめて一つします。
例えば、「long hair,,,1girl」というプロンプトを「long hair,1girl」と整理することができます。

## 注意事項)
ショートカットキーを使っているため、他のソフトウェアと競合する可能性があります。
また、個人で使用することを前提で作成したプログラムであるため、元のプロンプトが破壊された場合の責任はとれません。
重要なプロンプトに関しては元データをしっかり保持しておくことを推奨します。
