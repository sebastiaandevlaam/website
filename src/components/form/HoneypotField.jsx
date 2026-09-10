// A field no person can see or tab to, but a form-filling bot will complete.
// Anything that arrives with it set is dropped server-side.
//
// Hidden with an off-screen wrapper rather than `type="hidden"` (which bots
// skip) or `display:none` (which some skip too). aria-hidden and tabIndex keep
// it away from screen readers and the keyboard, so it is invisible to people
// using assistive technology as well as to sighted users.
const HoneypotField = ({ name, onChange }) => (
    <div className="form-honeypot" aria-hidden="true">
        <label htmlFor={`hp-${name}`}>Leave this field empty</label>
        <input
            id={`hp-${name}`}
            type="text"
            name={name}
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
            onChange={onChange}
        />
    </div>
);

export default HoneypotField;
