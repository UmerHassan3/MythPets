/**
 * Labelled rule between the OAuth button and the email form.
 *
 * The line is drawn with a border on a pseudo-free flex row rather than an
 * `<hr>` behind text, so it never shows through the label on a themed
 * background.
 */
const AuthDivider = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3" role="presentation">
    <span className="h-px flex-1 bg-border" />
    <span className="text-xs text-muted-foreground">{children}</span>
    <span className="h-px flex-1 bg-border" />
  </div>
);

export default AuthDivider;
