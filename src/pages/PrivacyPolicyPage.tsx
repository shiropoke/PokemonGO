export function PrivacyPolicyPage() {
  return (
    <article className="legal-page">
      <header className="legal-page__heading">
        <span>サイトポリシー</span>
        <h1>プライバシーポリシー</h1>
      </header>

      <div className="legal-document">
        <p>
          「GO Scope」（以下「本サイト」）は利用者のプライバシーを尊重し、
          本サイトで利用するデータを以下のとおり取り扱います。
        </p>

        <section>
          <h2>1. アカウント・個人情報</h2>
          <p>
            本サイトでは現在、アカウント登録や、氏名・メールアドレス・電話番号等の個人情報の入力を求めていません。
          </p>
        </section>

        <section>
          <h2>2. ブラウザ内への保存</h2>
          <p>
            本サイトは、設定、お気に入り、個体値チェッカーの入力内容、今週のイベントの表示方式、
            取得データのキャッシュ等を、利用者のブラウザ内のlocalStorageへ保存します。
            保存した情報はページを閉じた後も残る場合があります。
          </p>
          <p>
            メニュー内の「このサイトの保存データを削除」機能を利用することで、
            本サイトがlocalStorageへ保存したデータを削除できます。ブラウザの設定から削除することもできます。
          </p>
        </section>

        <section>
          <h2>3. 外部サービスとの通信</h2>
          <p>
            本サイトは、ページおよび静的データの配信、イベント・レイド等のデータ取得、画像表示等のため、
            GitHub Pages、GitHub・raw.githubusercontent.com、ScrapedDuck、Leek Duck等の外部サービスへ
            ブラウザから通信する場合があります。
          </p>
          <p>
            HTTP通信の性質上、通信先にはIPアドレス、User-Agentその他の通常の通信情報が送信される可能性があります。
            これらの情報の取り扱いには、各外部サービスのプライバシーポリシー等が適用されます。
          </p>
        </section>

        <section>
          <h2>4. GitHub Pages</h2>
          <p>
            本サイトはGitHub Pagesで公開されています。GitHub側で通常のアクセスログ等が取り扱われる可能性があります。
            詳細は
            <a
              href="https://docs.github.com/ja/site-policy/privacy-policies/github-general-privacy-statement"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHubの一般プライバシーステートメント
            </a>
            をご確認ください。
          </p>
        </section>

        <section>
          <h2>5. アクセス解析・広告・Cookie</h2>
          <p>
            現在、本サイト独自のアクセス解析サービスや広告配信用Cookieは導入していません。
            また、本サイト独自のCookieによる設定保存は行っていません。
            ただし、外部サービス側でのCookie等の取り扱いについては、各サービスの方針をご確認ください。
          </p>
        </section>

        <section>
          <h2>6. サイト共有機能</h2>
          <p>
            サイト共有機能は、利用者自身のブラウザまたはOSが提供するWeb Share API、
            もしくはClipboard APIを利用します。共有先を選択した後は、そのサービスの利用規約および
            プライバシーポリシーが適用されます。
          </p>
        </section>

        <section>
          <h2>7. 第三者への提供</h2>
          <p>
            本サイトには、運営者が利用者の個人情報を販売する機能はありません。
            ただし、本ポリシーに記載した外部サービスへの通常の通信は発生します。
          </p>
        </section>

        <section>
          <h2>8. ポリシーの変更</h2>
          <p>
            サイト機能や利用サービスの変更に応じて、本ポリシーを変更する場合があります。
            変更後の内容は本ページへ掲載します。
          </p>
        </section>

        <footer className="legal-document__dates">
          <time dateTime="2026-08-25">制定日：2026年8月25日</time>
        </footer>
      </div>
    </article>
  );
}

export default PrivacyPolicyPage;
