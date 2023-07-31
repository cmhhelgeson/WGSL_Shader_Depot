


export const CodeMirrorNav: React.FunctionComponent<React.PropsWithChildren> = (props) => {
  return (
    <div>
      <nav>
        <ul>
          {sources.map((src, i) => {
            return (
              <li key={i}>
                <a
                  href={`#${src.name}`}
                data-active={activeHash == src.name}
                onClick={() => {
                  setActiveHash(src.name);
                }}
              >
                {src.name}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
    {sources.map((src, i) => {
      console.log(src);
      return (
        <src.Container
          className={styles.sourceFileContainer}
          data-active={activeHash == src.name}
          key={i}
        />
      );
    })}
  </div>
  )
}