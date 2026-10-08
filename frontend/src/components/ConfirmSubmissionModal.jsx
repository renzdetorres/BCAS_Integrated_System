import Modal from "./ui/Modal.jsx";

/**
 * Asked once, right before an application is sent, because after that the
 * applicant can no longer change it.
 */
export default function ConfirmSubmissionModal({ open, onCancel, onConfirm, isSubmitting = false, noun = "application" }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      busy={isSubmitting}
      size="sm"
      title="Confirm submission"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={isSubmitting} data-autofocus>
            {isSubmitting ? "Submitting..." : "Confirm Submission"}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, lineHeight: 1.6 }}>
        Are you sure you want to submit your {noun}? After submission, you will no longer be able to edit your{" "}
        {noun} details.
      </p>
    </Modal>
  );
}
