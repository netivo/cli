import { useBlockProps } from '@wordpress/block-editor';

export default function Edit({ clientId, attributes, setAttributes }) {
  const blockProps = useBlockProps({
    className: 'block b-block',
  });

  return (
    <>
      <div {...blockProps}>
          Edit block
      </div>
    </>
  );
}