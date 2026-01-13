import {useBlockProps, InnerBlocks} from '@wordpress/block-editor';

export default function Save({attributes}) {
  const blockProps = useBlockProps.save({
    className: 'block b-block'
  });

  return (
    <>
      <div {...blockProps} >
          Save block
      </div>
    </>
  );
}