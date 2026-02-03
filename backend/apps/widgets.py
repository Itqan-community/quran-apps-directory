"""
Custom admin widgets for the apps module.
"""
from django.contrib.admin.widgets import AdminFileWidget


class AdminImageWithPreview(AdminFileWidget):
    """
    Custom widget that shows an inline preview thumbnail next to the file input.
    Reduces vertical space in the admin by showing preview and input on the same row.
    """

    template_name = 'admin/widgets/image_with_preview.html'

    def __init__(self, preview_height=60, attrs=None):
        self.preview_height = preview_height
        super().__init__(attrs)

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        context['widget']['preview_height'] = self.preview_height
        return context
